import { betterAuth } from "better-auth";
import { admin, magicLink } from "better-auth/plugins";
import { getMigrations } from "better-auth/db";
import Database from "better-sqlite3";

/**
 * Creates a Better Auth test instance with in-memory database
 * Adapted from Better Auth's test utilities for use with tap
 *
 * @returns {Promise<{auth: Object, client: Object, db: Database}>}
 */
export async function getTestInstance() {
  // Create in-memory database
  const db = new Database(":memory:");

  // Configure Better Auth for testing
  const auth = betterAuth({
    database: db,
    baseURL: "http://localhost:3000",
    logger: {
      disabled: true, // Suppress logs during tests
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      },
    },
    telemetry: {
      enabled: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, token, url }) => {
          // Store magic link for testing
          // Tests can access this via the returned magicLinks array
          if (!auth._testMagicLinks) {
            auth._testMagicLinks = [];
          }
          auth._testMagicLinks.push({ email, token, url });
          return Promise.resolve();
        },
      }),
      admin(),
    ],
  });

  // Run migrations to create database tables
  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();

  // Create client helper for common operations
  const client = {
    signUp: async (body) => {
      const result = await auth.api.signUpEmail({
        body,
        headers: new Headers(),
      });
      return result;
    },

    signIn: async (body) => {
      const result = await auth.api.signInEmail({
        body,
        headers: new Headers(),
        returnHeaders: true,
      });
      return result;
    },

    // Admin methods (based on spike findings)
    admin: {
      setRole: async ({ userId, role }) => {
        // Based on spike findings: direct database UPDATE is required
        // The admin.setRole endpoint requires authentication, so direct DB access is simpler for testing
        const db = auth.options?.database;
        if (!db) throw new Error("Cannot access database for role update");
        db.prepare("UPDATE user SET role = ? WHERE id = ?").run(role, userId);
      },
    },
  };

  // Helper to get session headers for authenticated requests
  const getAuthHeaders = async (email, password) => {
    const result = await client.signIn({ email, password });

    if (!result.headers) {
      throw new Error("No headers returned from sign in");
    }

    const setCookie = result.headers.get("set-cookie");
    if (!setCookie) {
      throw new Error("No session cookie in sign in response");
    }

    // Parse cookie to extract session token
    // Note: Fragile cookie parsing. May break if:
    // - Multiple Set-Cookie headers use newlines instead of commas
    // - Better Auth changes cookie naming convention
    // - Multiple session cookies are present
    // If this breaks, consider using a proper cookie parser library
    const cookies = setCookie.split(",").map((c) => c.trim());
    const sessionCookie = cookies.find((c) =>
      c.startsWith("better-auth.session_token"),
    );

    if (!sessionCookie) {
      throw new Error("No session token cookie found");
    }

    // Return just the cookie header value
    return { cookie: sessionCookie.split(";")[0] };
  };

  return {
    auth,
    client,
    db,
    getAuthHeaders,
    getMagicLinks: () => auth._testMagicLinks || [],
  };
}
