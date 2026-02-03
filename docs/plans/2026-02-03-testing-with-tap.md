# Testing with Tap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive test coverage to auth-auth using tap and Better Auth's test utilities

**Architecture:** Feature-based integration tests using Better Auth's test instance helper adapted for tap. Each test gets isolated in-memory SQLite database. Tests verify complete user flows from HTTP request to response.

**Tech Stack:** tap, Better Auth test utilities, better-sqlite3 (in-memory), Hono

---

## Task 0: Spike - Investigate Better Auth Test Utilities

**Files:**

- Create: `spike/test-instance-poc.js` (temporary, will be deleted)
- Create: `spike/FINDINGS.md` (document results)

**Step 1: Clone Better Auth repository**

```bash
cd /tmp
git clone https://github.com/better-auth/better-auth.git
cd better-auth
```

Expected: Repository cloned successfully

**Step 2: Locate test instance helper**

Search for test utilities:

```bash
find . -name "*test-instance*" -o -name "*test-utils*" | grep -v node_modules
```

Expected: Find test utility files (likely in packages/better-auth/src/ or tests/)

**Step 3: Read test instance implementation**

Open the test instance file and document:

- How `getTestInstance()` is implemented
- Dependencies (vitest-specific or generic?)
- How `runWithUser()` manages async context
- Admin plugin API methods
- Magic link test utilities

Create `spike/FINDINGS.md`:

```markdown
# Better Auth Test Utilities Spike

## Location

- File: [path to test-instance file]
- Package: [better-auth or separate]

## getTestInstance() Implementation

[Summary of how it works]

## runWithUser() Implementation

[How async context is managed]

## Vitest Dependencies

[List any vitest-specific features used]

## Admin API

[Document admin plugin methods for setting roles]

## Magic Link Testing

[Any utilities for testing magic links]

## Conclusion

- [ ] Can be used directly with tap
- [ ] Needs adaptation (list what)
- [ ] Must implement custom version (why)
```

**Step 4: Build proof-of-concept**

Create `spike/test-instance-poc.js`:

```javascript
import { test } from "tap";
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

// Copy or adapt Better Auth's getTestInstance based on findings
async function getTestInstance() {
  const db = new Database(":memory:");

  const auth = betterAuth({
    database: db,
    baseURL: "http://localhost:3000",
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
  });

  // Attempt to use Better Auth's test utilities
  // or implement minimal version
  const client = {
    signUp: (body) => auth.api.signUpEmail({ body, headers: new Headers() }),
    signIn: (body) => auth.api.signInEmail({ body, headers: new Headers() }),
  };

  return { auth, client, db };
}

test("spike: basic test instance creation", async (t) => {
  const { auth, client } = await getTestInstance();

  t.ok(auth, "auth instance created");
  t.ok(client, "client created");

  // Try creating a user
  await client.signUp({
    email: "test@example.com",
    password: "pass123",
    name: "Test User",
  });

  t.pass("user created successfully");
});
```

**Step 5: Install tap for spike testing**

```bash
npm install --save-dev tap
```

Expected: tap installed in devDependencies

**Step 6: Run POC and document results**

```bash
npx tap spike/test-instance-poc.js
```

Expected: Either PASS or FAIL with clear error. Document in FINDINGS.md.

**Step 7: Update FINDINGS.md with decision**

Based on POC results, document:

- Does Better Auth's test instance work with tap?
- What adaptations are needed?
- Admin API: How to set user roles?
- Recommended approach going forward

**Step 8: Commit spike findings**

```bash
git add spike/
git commit -m "spike: investigate Better Auth test utilities for tap

Document findings on test instance helper portability and
admin API usage. [Include key decision here]"
```

**Time limit:** 2 hours maximum. If blocked, document issues and propose fallback approach.

---

## Task 1: Install and Configure Tap

**Files:**

- Modify: `package.json`
- Create: `.taprc`
- Modify: `.gitignore`

**Step 1: Install tap**

```bash
npm install --save-dev tap
```

Expected: tap added to devDependencies, package-lock.json updated

**Step 2: Add test scripts to package.json**

Modify the `scripts` section in `package.json`:

```json
"scripts": {
  "dev": "node --watch src/index.js",
  "db:generate": "npx @better-auth/cli generate --yes",
  "db:migrate": "npx @better-auth/cli migrate --yes",
  "prettier:check": "prettier --check '**/*.{js,css,md,yml}'",
  "prettier:write": "prettier --write '**/*.{js,css,md,yml}'",
  "husky": "husky",
  "lint": "eslint .",
  "start": "node src/index.js",
  "test": "tap",
  "test:watch": "tap --watch",
  "test:coverage": "tap --coverage-report=html"
}
```

**Step 3: Create tap configuration**

Create `.taprc`:

```yaml
files:
  - "test/**/*.test.js"
timeout: 10
coverage: true
```

**Step 4: Update .gitignore**

Add to `.gitignore`:

```
coverage/
.tap/
```

**Step 5: Verify tap works**

```bash
npm test
```

Expected: "No test files found" or similar (since we haven't created tests yet)

**Step 6: Commit**

```bash
git add package.json package-lock.json .taprc .gitignore
git commit -m "chore: install tap and configure test infrastructure"
```

---

## Task 2: Create Test Instance Helper

**Files:**

- Create: `test/helpers/test-instance.js`

**Step 1: Create test instance helper**

Based on spike findings, create `test/helpers/test-instance.js`:

```javascript
import { betterAuth } from "better-auth";
import { admin, magicLink } from "better-auth/plugins";
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

  // Wait for auth to initialize (creates tables)
  // Try to get session to trigger table creation
  try {
    await auth.api.getSession({
      headers: new Headers(),
    });
  } catch (e) {
    // Expected to fail with no session
  }

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
        // TODO: Implement based on spike Task 0 findings
        // Spike should reveal Better Auth admin API or DB schema
        //
        // Better Auth may expose admin API like:
        //   await auth.admin.setRole({ userId, role })
        //
        // Or may require direct DB access:
        //   const db = auth.options?.database;
        //   if (!db) throw new Error("Cannot access database");
        //   db.prepare("UPDATE user SET role = ? WHERE id = ?").run(role, userId);
        //
        // This placeholder will fail tests with clear error until implemented
        throw new Error(
          "setRole implementation pending spike completion. " +
            "Check spike/FINDINGS.md for Better Auth admin API details.",
        );
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
```

**Step 2: Create simple verification test**

Create `test/helpers/test-instance.test.js`:

```javascript
import { test } from "tap";
import { getTestInstance } from "./test-instance.js";

test("getTestInstance creates auth and client", async (t) => {
  const { auth, client, db } = await getTestInstance();

  t.ok(auth, "auth instance exists");
  t.ok(client, "client exists");
  t.ok(db, "database exists");
  t.equal(typeof client.signUp, "function", "client has signUp method");
});

test("getTestInstance can create users", async (t) => {
  const { client } = await getTestInstance();

  const result = await client.signUp({
    email: "test@example.com",
    password: "pass123",
    name: "Test User",
  });

  t.ok(result.user, "user created");
  t.equal(result.user.email, "test@example.com", "email matches");
});
```

**Step 3: Run verification test**

```bash
npm test test/helpers/test-instance.test.js
```

Expected: PASS (both tests)

**Step 4: Commit**

```bash
git add test/helpers/test-instance.js test/helpers/test-instance.test.js
git commit -m "test: add test instance helper for Better Auth

Creates isolated in-memory databases for each test.
Provides client helpers for common auth operations."
```

---

## Task 3: Create App Test Helper

**Files:**

- Create: `test/helpers/app.js`

**Step 1: Create app factory helper**

Create `test/helpers/app.js`:

```javascript
import { Hono } from "hono";
import authHandler from "../../src/app/routes/auth.js";
import homeHandler from "../../src/app/routes/home.js";
import profileHandler from "../../src/app/routes/profile.js";
import whoamiHandler from "../../src/app/routes/whoami.js";
import adminHandler from "../../src/app/routes/admin.js";

/**
 * Creates a Hono app instance configured for testing
 * Uses the provided Better Auth instance for authentication
 *
 * @param {Object} auth - Better Auth instance from getTestInstance()
 * @returns {Hono} Configured Hono app
 */
export function createTestApp(auth) {
  const app = new Hono();

  // Better-auth API routes
  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  // Session middleware - adds user and session to context
  app.use("*", async (c, next) => {
    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      c.set("user", session?.user || null);
      c.set("session", session?.session || null);
    } catch (error) {
      c.set("user", null);
      c.set("session", null);
    }

    return next();
  });

  // Register all route handlers
  app.route("/", authHandler);
  app.route("/", homeHandler);
  app.route("/", profileHandler);
  app.route("/", whoamiHandler);
  app.route("/", adminHandler);

  return app;
}
```

**Step 2: Create verification test**

Create `test/helpers/app.test.js`:

```javascript
import { test } from "tap";
import { getTestInstance } from "./test-instance.js";
import { createTestApp } from "./app.js";

test("createTestApp creates Hono app", async (t) => {
  const { auth } = await getTestInstance();
  const app = createTestApp(auth);

  t.ok(app, "app instance created");
  t.equal(typeof app.request, "function", "app has request method");
});

test("app responds to home page", async (t) => {
  const { auth } = await getTestInstance();
  const app = createTestApp(auth);

  const res = await app.request("/");

  t.equal(res.status, 200, "home page returns 200");
});
```

**Step 3: Run verification test**

```bash
npm test test/helpers/app.test.js
```

Expected: PASS (both tests)

**Step 4: Commit**

```bash
git add test/helpers/app.js test/helpers/app.test.js
git commit -m "test: add app factory helper for Hono test instances

Creates Hono apps with auth middleware configured.
Uses same auth instance as test utilities for consistency."
```

---

## Task 4: First Feature Test - Unauthenticated Home Page

**Files:**

- Create: `test/features/home.test.js`

**Step 1: Write simple home page test**

Create `test/features/home.test.js`:

```javascript
import { test } from "tap";
import { getTestInstance } from "../helpers/test-instance.js";
import { createTestApp } from "../helpers/app.js";

test("home page feature tests", async (t) => {
  t.beforeEach(async () => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);
    return { testInstance, app };
  });

  t.test("home page loads without authentication", async (t) => {
    const { app } = t.context;

    const res = await app.request("/");

    t.equal(res.status, 200, "returns 200 OK");
    const html = await res.text();
    t.match(html, /auth-auth/i, "contains app name");
  });

  t.test("home page has login link", async (t) => {
    const { app } = t.context;

    const res = await app.request("/");
    const html = await res.text();

    t.match(html, /login/i, "contains login link");
  });
});
```

**Step 2: Run test**

```bash
npm test test/features/home.test.js
```

Expected: PASS (both tests)

**Step 3: Commit**

```bash
git add test/features/home.test.js
git commit -m "test: add home page feature tests

Verifies unauthenticated home page loads and has login links."
```

---

## Task 5: Authentication Feature Tests - Signup and Login

**Files:**

- Create: `test/features/authentication.test.js`

**Step 1: Write signup and login tests**

Create `test/features/authentication.test.js`:

```javascript
import { test } from "tap";
import { getTestInstance } from "../helpers/test-instance.js";
import { createTestApp } from "../helpers/app.js";

test("authentication feature tests", async (t) => {
  t.beforeEach(async () => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);
    return { testInstance, app };
  });

  t.test("user can sign up with email and password", async (t) => {
    const { app } = t.context;

    const formData = new URLSearchParams();
    formData.append("name", "New User");
    formData.append("email", "newuser@example.com");
    formData.append("password", "securepass123");

    const res = await app.request("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    t.equal(res.status, 302, "redirects after signup");
    t.match(
      res.headers.get("location"),
      /\/profile/,
      "redirects to profile page",
    );
    t.ok(res.headers.get("set-cookie"), "sets session cookie");
  });

  t.test("user can login with valid credentials", async (t) => {
    const { testInstance, app } = t.context;
    const { client } = testInstance;

    // Create user first
    await client.signUp({
      email: "login@example.com",
      password: "password123",
      name: "Login User",
    });

    // Attempt login via form
    const formData = new URLSearchParams();
    formData.append("email", "login@example.com");
    formData.append("password", "password123");
    formData.append("redirect_url", "/profile");

    const res = await app.request("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    t.equal(res.status, 302, "redirects after login");
    t.match(res.headers.get("location"), /\/profile/, "redirects to profile");
    t.ok(res.headers.get("set-cookie"), "sets session cookie");
  });

  t.test("login fails with invalid password", async (t) => {
    const { testInstance, app } = t.context;
    const { client } = testInstance;

    await client.signUp({
      email: "valid@example.com",
      password: "correctpass",
      name: "Valid User",
    });

    const formData = new URLSearchParams();
    formData.append("email", "valid@example.com");
    formData.append("password", "wrongpass");
    formData.append("redirect_url", "/profile");

    const res = await app.request("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    t.equal(res.status, 302, "redirects after failed login");
    t.match(res.headers.get("location"), /\/login/, "redirects back to login");
    t.match(res.headers.get("location"), /error/, "includes error parameter");
  });

  t.test("login fails with nonexistent user", async (t) => {
    const { app } = t.context;

    const formData = new URLSearchParams();
    formData.append("email", "nonexistent@example.com");
    formData.append("password", "anypass");
    formData.append("redirect_url", "/profile");

    const res = await app.request("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    t.equal(res.status, 302, "redirects after failed login");
    t.match(res.headers.get("location"), /\/login/, "redirects back to login");
  });
});
```

**Step 2: Run tests**

```bash
npm test test/features/authentication.test.js
```

Expected: PASS (all 4 tests)

**Step 3: Commit**

```bash
git add test/features/authentication.test.js
git commit -m "test: add signup and login authentication tests

Covers happy path (signup, login) and error cases
(invalid password, nonexistent user)."
```

---

## Task 6: Authentication Feature Tests - Logout

**Files:**

- Modify: `test/features/authentication.test.js`

**Step 1: Add logout test to authentication.test.js**

Add to the test suite in `test/features/authentication.test.js`:

```javascript
t.test("user can logout", async (t) => {
  const { testInstance, app } = t.context;
  const { client, getAuthHeaders } = testInstance;

  // Create and login user
  await client.signUp({
    email: "logout@example.com",
    password: "password123",
    name: "Logout User",
  });

  const headers = await getAuthHeaders("logout@example.com", "password123");

  // Verify user is logged in by accessing profile
  const profileBefore = await app.request("/profile", { headers });
  t.equal(profileBefore.status, 200, "user is logged in");

  // Logout
  const res = await app.request("/logout", {
    method: "POST",
    headers,
  });

  t.equal(res.status, 302, "redirects after logout");
  t.match(res.headers.get("location"), /\//, "redirects to home");

  // Verify session is invalidated
  const profileAfter = await app.request("/profile", { headers });
  t.equal(profileAfter.status, 302, "profile requires authentication");
  t.match(
    profileAfter.headers.get("location"),
    /\/login/,
    "redirects to login",
  );
});
```

**Step 2: Run tests**

```bash
npm test test/features/authentication.test.js
```

Expected: PASS (5 tests now)

**Step 3: Commit**

```bash
git add test/features/authentication.test.js
git commit -m "test: add logout authentication test

Verifies logout invalidates session and redirects to home."
```

---

## Task 7: Profile Feature Tests

**Files:**

- Create: `test/features/profile.test.js`

**Step 1: Write profile tests**

Create `test/features/profile.test.js`:

```javascript
import { test } from "tap";
import { getTestInstance } from "../helpers/test-instance.js";
import { createTestApp } from "../helpers/app.js";

test("profile feature tests", async (t) => {
  t.beforeEach(async () => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);
    return { testInstance, app };
  });

  t.test("authenticated user can view profile", async (t) => {
    const { testInstance, app } = t.context;
    const { client, getAuthHeaders } = testInstance;

    await client.signUp({
      email: "profile@example.com",
      password: "password123",
      name: "Profile User",
    });

    const headers = await getAuthHeaders("profile@example.com", "password123");
    const res = await app.request("/profile", { headers });

    t.equal(res.status, 200, "profile page loads");
    const html = await res.text();
    t.match(html, /profile@example\.com/, "displays user email");
    t.match(html, /Profile User/, "displays user name");
  });

  t.test("unauthenticated user redirects to login", async (t) => {
    const { app } = t.context;

    const res = await app.request("/profile");

    t.equal(res.status, 302, "redirects unauthenticated user");
    t.match(res.headers.get("location"), /\/login/, "redirects to login page");
  });

  t.test("profile with invalid session redirects to login", async (t) => {
    const { app } = t.context;

    // Use invalid cookie
    const res = await app.request("/profile", {
      headers: {
        cookie: "better-auth.session_token=invalid-token",
      },
    });

    t.equal(res.status, 302, "redirects with invalid session");
    t.match(res.headers.get("location"), /\/login/, "redirects to login");
  });
});
```

**Step 2: Run tests**

```bash
npm test test/features/profile.test.js
```

Expected: PASS (all 3 tests)

**Step 3: Commit**

```bash
git add test/features/profile.test.js
git commit -m "test: add profile feature tests

Tests profile viewing for authenticated users and
redirect behavior for unauthenticated/invalid sessions."
```

---

## Task 8: Admin Feature Tests

**Files:**

- Create: `test/features/admin.test.js`

**Step 1: Write admin tests**

Create `test/features/admin.test.js`:

```javascript
import { test } from "tap";
import { getTestInstance } from "../helpers/test-instance.js";
import { createTestApp } from "../helpers/app.js";

test("admin feature tests", async (t) => {
  t.beforeEach(async () => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);
    return { testInstance, app };
  });

  t.test("admin user can access admin panel", async (t) => {
    const { testInstance, app } = t.context;
    const { client, getAuthHeaders } = testInstance;

    const result = await client.signUp({
      email: "admin@example.com",
      password: "adminpass",
      name: "Admin User",
    });

    // Set admin role
    await client.admin.setRole({
      userId: result.user.id,
      role: "admin",
    });

    const headers = await getAuthHeaders("admin@example.com", "adminpass");
    const res = await app.request("/admin", { headers });

    t.equal(res.status, 200, "admin page loads for admin");
    const html = await res.text();
    t.match(html, /Admin/i, "displays admin content");
  });

  t.test("regular user cannot access admin panel", async (t) => {
    const { testInstance, app } = t.context;
    const { client, getAuthHeaders } = testInstance;

    await client.signUp({
      email: "user@example.com",
      password: "userpass",
      name: "Regular User",
    });

    const headers = await getAuthHeaders("user@example.com", "userpass");
    const res = await app.request("/admin", { headers });

    t.equal(res.status, 302, "redirects non-admin user");
    const location = res.headers.get("location");
    t.notMatch(location, /\/admin/, "does not show admin panel");
  });

  t.test("unauthenticated user cannot access admin panel", async (t) => {
    const { app } = t.context;

    const res = await app.request("/admin");

    t.equal(res.status, 302, "redirects unauthenticated user");
    t.match(res.headers.get("location"), /\/login/, "redirects to login");
  });
});
```

**Step 2: Implement admin setRole based on spike findings**

Before running tests, update `test/helpers/test-instance.js` admin.setRole method (around line 322) with the actual implementation discovered in the spike.

Based on spike findings, replace the placeholder error with working code. Example implementations:

If Better Auth provides admin API:

```javascript
await auth.admin.setRole({ userId, role });
```

If direct DB access is needed:

```javascript
const db = auth.options?.database;
if (!db) throw new Error("Cannot access database for role update");
db.prepare("UPDATE user SET role = ? WHERE id = ?").run(role, userId);
```

**Step 3: Run tests**

```bash
npm test test/features/admin.test.js
```

Expected: PASS (all 3 tests)

If tests fail, verify:

- Admin setRole implementation matches spike findings
- `src/app/routes/admin.js` checks for admin role
- Better Auth admin plugin is configured correctly

**Step 4: Commit**

```bash
git add test/features/admin.test.js
git commit -m "test: add admin feature tests

Tests admin panel access control for admin users,
regular users, and unauthenticated users."
```

---

## Task 9: Magic Link Feature Tests

**Files:**

- Create: `test/features/magic-links.test.js`

**Step 1: Write magic link tests**

Create `test/features/magic-links.test.js`:

```javascript
import { test } from "tap";
import { getTestInstance } from "../helpers/test-instance.js";
import { createTestApp } from "../helpers/app.js";

test("magic links feature tests", async (t) => {
  t.beforeEach(async () => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);
    return { testInstance, app };
  });

  t.test("user can request magic link", async (t) => {
    const { testInstance, app } = t.context;
    const { client } = testInstance;

    await client.signUp({
      email: "magic@example.com",
      password: "password123",
      name: "Magic User",
    });

    const formData = new URLSearchParams();
    formData.append("email", "magic@example.com");

    const res = await app.request("/login/magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    t.equal(res.status, 302, "redirects after requesting magic link");
    t.match(
      res.headers.get("location"),
      /success/,
      "redirects with success message",
    );
  });

  t.test("magic link request for nonexistent user succeeds", async (t) => {
    const { app } = t.context;

    const formData = new URLSearchParams();
    formData.append("email", "nonexistent@example.com");

    const res = await app.request("/login/magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    // Should still show success to prevent email enumeration
    t.equal(res.status, 302, "redirects after requesting magic link");
    t.match(
      res.headers.get("location"),
      /success/,
      "shows success message even for nonexistent user",
    );
  });

  t.test("magic link GET page renders form", async (t) => {
    const { app } = t.context;

    const res = await app.request("/login/magic-link");

    t.equal(res.status, 200, "magic link page loads");
    const html = await res.text();
    t.match(html, /Magic Link/i, "displays magic link heading");
    t.match(html, /email/i, "has email input");
  });

  t.test("magic link URL is captured in test", async (t) => {
    const { testInstance, app } = t.context;
    const { client, getMagicLinks } = testInstance;

    await client.signUp({
      email: "magic-url@example.com",
      password: "password123",
      name: "Magic URL User",
    });

    const formData = new URLSearchParams();
    formData.append("email", "magic-url@example.com");

    await app.request("/login/magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const magicLinks = getMagicLinks();
    t.ok(magicLinks.length > 0, "magic link was generated");
    t.equal(
      magicLinks[0].email,
      "magic-url@example.com",
      "magic link for correct email",
    );
    t.ok(magicLinks[0].url, "magic link has URL");
    t.ok(magicLinks[0].token, "magic link has token");
  });
});
```

**Step 2: Run tests**

```bash
npm test test/features/magic-links.test.js
```

Expected: PASS (all 4 tests)

**Step 3: Commit**

```bash
git add test/features/magic-links.test.js
git commit -m "test: add magic link feature tests

Tests magic link request flow and URL capture.
Verifies email enumeration protection."
```

---

## Task 10: Run All Tests and Verify

**Files:**

- None (verification only)

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests PASS

**Step 2: Check test count**

Verify we have tests for:

- Home page (2 tests)
- Authentication (5 tests)
- Profile (3 tests)
- Admin (3 tests)
- Magic links (4 tests)
- Helpers (4 tests)

Total: ~21 tests

**Step 3: Run with coverage**

```bash
npm run test:coverage
```

Expected: Coverage report generated in `coverage/` directory

**Step 4: Review coverage**

Open `coverage/index.html` and verify:

- Routes have reasonable coverage (>70%)
- Test helpers have high coverage (>80%)
- Overall coverage is acceptable for first iteration

**Step 5: Document results**

Note any files with low coverage that need additional tests.

**Step 6: Verify test isolation**

Run tests in random order to verify no test dependencies:

```bash
npm test -- --no-coverage --shuffle
```

Expected: All tests still PASS

If any tests fail, they have hidden dependencies on test execution order. Fix by ensuring each test properly isolates state via `t.beforeEach()`.

---

## Task 11: Clean Up Helper Tests

**Files:**

- Delete: `test/helpers/test-instance.test.js`
- Delete: `test/helpers/app.test.js`

**Step 1: Remove helper test files**

The helper verification tests were useful during development but are now redundant since feature tests use these helpers extensively.

```bash
rm test/helpers/test-instance.test.js test/helpers/app.test.js
```

**Step 2: Run tests to verify nothing breaks**

```bash
npm test
```

Expected: All feature tests still PASS (should be ~17 tests now)

**Step 3: Commit**

```bash
git add -A
git commit -m "test: remove redundant helper verification tests

Helper tests served their purpose during development.
Feature tests now provide adequate helper coverage."
```

---

## Task 12: Update Documentation

**Files:**

- Modify: `CLAUDE.md`

**Step 1: Add testing section to CLAUDE.md**

Add after the "Development Commands" section:

````markdown
**Testing:**

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode (re-runs on file changes)
- `npm run test:coverage` - Generate HTML coverage report

Tests are organized by feature in `test/features/`. Each test uses isolated
in-memory SQLite databases for complete isolation. Test helpers in
`test/helpers/` provide utilities for creating test instances and apps.

**Running specific tests:**

```sh
npm test test/features/authentication.test.js  # Run one file
npm test -- --grep "login"                      # Run tests matching pattern
```
````

**Test structure:**

- `test/features/` - Feature-based integration tests
- `test/helpers/` - Test utilities and factories
- Tests use Better Auth's test utilities adapted for tap

````

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add testing documentation to CLAUDE.md

Documents test commands, structure, and running specific tests."
````

---

## Task 13: Delete Spike Directory

**Files:**

- Delete: `spike/` (entire directory)

**Step 1: Remove spike directory**

Now that implementation is complete, the spike findings are documented and the POC is no longer needed.

```bash
rm -rf spike/
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove spike directory

Spike findings incorporated into implementation.
POC code no longer needed."
```

---

## Notes

**Test Isolation:**
Each test gets a fresh in-memory database via `t.beforeEach()`. This ensures no state leaks between tests.

**Better Auth Test Utilities:**
The implementation adapts Better Auth's test utilities for tap. If the spike revealed that Better Auth's utilities can't be used directly, the test-instance.js helper provides a compatible alternative.

**Admin Role Testing:**
The admin tests assume Better Auth's admin plugin provides role management. If the spike revealed a different approach is needed, adjust the `client.admin.setRole()` implementation in test-instance.js.

**Magic Links:**
Magic links are captured in `auth._testMagicLinks` array for testing. Tests can retrieve and use these URLs to verify the magic link flow.

**Common Issues:**

- If tests fail with "session not found", verify cookies are being set and parsed correctly
- If tests timeout, check `.taprc` timeout setting (should be 10 seconds)
- If coverage is low, add more negative test cases and edge cases

**Next Steps:**

- Add more error case tests (malformed requests, XSS attempts, etc.)
- Add tests for utilities (`src/app/utils/`)
- Add tests for handlers (`src/app/handlers/`)
- Consider adding GitHub OAuth tests with mocking
