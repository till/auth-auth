import { Hono } from "hono";
import { html } from "hono/html";
import { Layout, Navigation } from "../../src/app/components/layout.js";
import { Message, FormSection } from "../../src/app/components/common.js";
import {
  GitHubButton,
  Login,
  MagicLinkButton,
} from "../../src/app/components/login.js";
import homeHandler from "../../src/app/routes/home.js";
import profileHandler from "../../src/app/routes/profile.js";
import whoamiHandler from "../../src/app/routes/whoami.js";
import adminHandler from "../../src/app/routes/admin.js";
import { getLink } from "../../src/app/utils/links.js";
import { validateRedirectUrl } from "../../src/app/utils/redirect.js";
import { forwardCookies } from "../../src/app/utils/cookies.js";

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
    } catch {
      c.set("user", null);
      c.set("session", null);
    }

    return next();
  });

  // Create auth routes with test instance
  const authRouter = new Hono()
    .get("/logout", async (c) => {
      const callbackURL = validateRedirectUrl(
        c.req.query("redirect_url"),
        "/?message=Bye!",
      );
      const status = await auth.api.signOut({
        headers: c.req.raw.headers,
        returnHeaders: true,
      });
      if (status.headers) {
        forwardCookies(status.headers, c);
      }
      return c.redirect(callbackURL);
    })
    .post("/logout", async (c) => {
      const callbackURL = validateRedirectUrl(
        c.req.query("redirect_url"),
        "/?message=Bye!",
      );
      const status = await auth.api.signOut({
        headers: c.req.raw.headers,
        returnHeaders: true,
      });
      if (status.headers) {
        forwardCookies(status.headers, c);
      }
      return c.redirect(callbackURL);
    })
    .get("/login", (c) => {
      const error = c.req.query("error");
      const success = c.req.query("success");
      const redirectUrl = validateRedirectUrl(c.req.query("redirect_url"), "");

      return c.html(
        Layout({
          title: "Sign In",
          children: html`
            <h1>Sign In</h1>
            ${Navigation({
              back: { href: "/", text: "Back to Home" },
              extra: {
                href: getLink("/signup", redirectUrl),
                text: "Don't have an account? Sign Up",
              },
            })}
            ${Message({ error, success })}
            ${FormSection({
              children: html`
                ${Login({ redirectUrl })} ${MagicLinkButton({ redirectUrl })}
                ${GitHubButton({ redirectUrl })}
              `,
            })}
          `,
        }),
      );
    })
    .get("/signup", (c) => {
      const error = c.req.query("error");
      const success = c.req.query("success");
      const redirectUrl = validateRedirectUrl(c.req.query("redirect_url"), "");

      return c.html(
        Layout({
          title: "Sign Up",
          children: html`
            <h1>Sign Up</h1>
            ${Navigation({
              back: { href: "/", text: "Back to Home" },
              extra: {
                href: getLink("/login", redirectUrl),
                text: "Already have an account? Sign In",
              },
            })}
            ${Message({ error, success })}
            <h2>Using email and password</h2>
            ${FormSection({
              children: html`
                <form method="post" action="/signup">
                  <input
                    type="hidden"
                    name="redirect_url"
                    value="${redirectUrl}"
                  />
                  <fieldset>
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      required
                    />
                  </fieldset>
                  <fieldset role="group">
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      required
                    />
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      required
                    />
                    <input type="submit" value="Create Account" />
                  </fieldset>
                </form>
                ${MagicLinkButton({ redirectUrl })}
                ${GitHubButton({ action: "signup", redirectUrl })}
              `,
            })}
          `,
        }),
      );
    })
    .post("/signup", async (c) => {
      const body = await c.req.parseBody();
      const { name, email, password, redirect_url } = body;

      const callbackURL = validateRedirectUrl(
        redirect_url,
        `/profile?success=${encodeURIComponent("Thanks for registering!")}`,
      );

      const status = await auth.api.signUpEmail({
        body: {
          name: name,
          email: email,
          password: password,
          callbackURL: callbackURL,
          rememberMe: true,
        },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });

      if (status.headers) {
        forwardCookies(status.headers, c);
      }

      return c.redirect(callbackURL);
    })
    .post("/login", async (c) => {
      const body = await c.req.parseBody();
      const { email, password, redirect_url } = body;

      const callbackURL = validateRedirectUrl(redirect_url, "/profile");
      const errorCallbackURL = validateRedirectUrl(redirect_url, "/login");

      const status = await auth.api.signInEmail({
        body: {
          email,
          password,
          rememberMe: true,
          callbackURL,
          errorCallbackURL,
        },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });

      if (status.headers) {
        forwardCookies(status.headers, c);
      }

      return c.redirect(status.response.url);
    })
    .get("/login/magic-link", (c) => {
      const redirectUrl = validateRedirectUrl(c.req.query("redirect_url"), "");

      return c.html(
        Layout({
          title: "Magic Link Login",
          children: html`
            <h1>Magic Link Login</h1>
            ${Navigation({
              back: {
                href: getLink("/login", redirectUrl),
                text: "Back to Login",
              },
            })}
            ${FormSection({
              children: html`
                <form method="post" action="/login/magic-link">
                  <input
                    type="hidden"
                    name="redirect_url"
                    value="${redirectUrl}"
                  />
                  <fieldset>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      required
                    />
                    <input type="submit" value="Send Magic Link" />
                  </fieldset>
                </form>
              `,
            })}
          `,
        }),
      );
    })
    .post("/login/magic-link", async (c) => {
      const body = await c.req.parseBody();
      const { email, redirect_url } = body;

      const intermediateURL = `/login/magic-link?success=${encodeURIComponent("Magic link sent! Check your email.")}`;
      const callbackURL = validateRedirectUrl(redirect_url, "/profile");
      const errorCallbackURL = validateRedirectUrl(
        redirect_url,
        "/login/magic-link",
      );

      try {
        await auth.api.signInMagicLink({
          body: {
            email,
            callbackURL,
            errorCallbackURL,
          },
          headers: c.req.raw.headers,
        });
        return c.redirect(intermediateURL);
      } catch {
        // Even on error, redirect to success to prevent email enumeration
        return c.redirect(intermediateURL);
      }
    });

  // Register all route handlers
  app.route("/", authRouter);
  app.route("/", homeHandler);
  app.route("/", profileHandler);
  app.route("/", whoamiHandler);
  app.route("/", adminHandler);

  return app;
}
