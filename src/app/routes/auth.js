import { Hono } from "hono";
import { html } from "hono/html";
import { Layout, Navigation } from "../components/layout.js";
import { Message, FormSection } from "../components/common.js";
import { Login, MagicLinkButton, PasskeyButton } from "../components/login.js";
import { auth } from "../../../auth.js";

// Helper function to forward Set-Cookie headers from better-auth response
const forwardCookies = (response, c) => {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  setCookieHeaders.forEach((cookie) => {
    c.header("Set-Cookie", cookie);
  });
};

export default new Hono()
  .get("/login", (c) => {
    // Login page
    const error = c.req.query("error");
    const success = c.req.query("success");

    return c.html(
      Layout({
        title: "Sign In",
        children: html`
          <h1>Sign In</h1>
          ${Navigation({
            back: { href: "/", text: "Back to Home" },
            extra: { href: "/signup", text: "Don't have an account? Sign Up" },
          })}
          ${Message({ error, success })}
          ${FormSection({
            children: html`
              ${Login()} ${MagicLinkButton()}
              ${PasskeyButton({ action: "signin" })}
            `,
          })}
        `,
      }),
    );
  })
  .get("/signup", (c) => {
    const error = c.req.query("error");
    const success = c.req.query("success");

    return c.html(
      Layout({
        title: "Sign Up",
        children: html`
          <h1>Sign Up</h1>
          ${Navigation({
            back: { href: "/", text: "Back to Home" },
            extra: { href: "/login", text: "Already have an account? Sign In" },
          })}
          ${Message({ error, success })}
          ${FormSection({
            children: html`
              <form method="post" action="/signup">
                <div class="form-group">
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    required
                  />
                </div>
                <div class="form-group">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                  />
                </div>
                <div class="form-group">
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                  />
                </div>
                <button type="submit">Create Account</button>
              </form>

              ${MagicLinkButton()}
            `,
          })}
        `,
      }),
    );
  })
  .post("/signup", async (c) => {
    // Sign up form handler
    const body = await c.req.parseBody();
    const { name, email, password } = body;

    try {
      const result = await auth.api.signUpEmail({
        body: {
          name,
          email,
          password,
        },
      });

      if (result.error) {
        return c.redirect(
          "/login?error=" +
            encodeURIComponent(result.error.message || "Sign up failed"),
        );
      }

      return c.redirect(
        "/login?success=" +
          encodeURIComponent("Account created! You can now sign in."),
      );
    } catch (error) {
      console.error(`Error in /signup: ${error}`);
      return c.redirect("/login?error=" + encodeURIComponent("Network error"));
    }
  })
  .post("/signin", async (c) => {
    // Sign in form handler
    const body = await c.req.parseBody();
    const { email, password } = body;

    try {
      const result = await auth.api.signInEmail({
        body: {
          email,
          password,
          rememberMe: true,
        },
        headers: c.req.raw.headers,
        asResponse: true,
      });

      if (!result.ok) {
        const error = await result.json();
        return c.redirect(
          "/login?error=" +
            encodeURIComponent(error.message || "Sign in failed"),
        );
      }

      // Forward the cookies from better-auth
      forwardCookies(result, c);

      return c.redirect("/profile?success=welcome+back");
    } catch (error) {
      console.error(`Error in /signin: ${error}`);
      return c.redirect("/login?error=" + encodeURIComponent("Network error"));
    }
  })
  .post("/logout", async (c) => {
    // Logout handler
    try {
      const result = await auth.api.signOut({
        headers: c.req.raw.headers,
        asResponse: true,
      });

      if (result.ok) {
        // Forward the cookies to clear the session
        forwardCookies(result, c);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }

    return c.redirect("/");
  })
  .get("/login/magic-link", (c) => {
    return c.html(
      Layout({
        title: "Magic Link Login",
        children: html`
          <h1>Magic Link Login</h1>
          ${Navigation({
            back: { href: "/login", text: "Back to Login" },
          })}
          ${Message({
            error: c.req.query("error"),
            success: c.req.query("success"),
          })}
          ${FormSection({
            children: html`
              <form method="post" action="/login/magic-link">
                <div class="form-group">
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <button type="submit">Send Magic Link</button>
              </form>
            `,
          })}
        `,
      }),
    );
  })
  .post("/login/magic-link", async (c) => {
    const body = await c.req.parseBody();
    const { email } = body;

    try {
      console.log("Calling signInMagicLink with:", { email });
      const result = await auth.api.signInMagicLink({
        body: { email },
        headers: c.req.raw.headers,
        asResponse: true,
      });

      if (!result.ok) {
        const error = await result.json();
        console.log("signInMagicLink error:", error);
        return c.redirect(
          "/login/magic-link?error=" +
            encodeURIComponent(error.message || "Failed to send magic link"),
        );
      }

      console.log("Magic link sent successfully");
      return c.redirect(
        "/login/magic-link?success=" +
          encodeURIComponent("Magic link sent! Check your email."),
      );
    } catch (error) {
      console.error("signInMagicLink catch error:", error);
      return c.redirect(
        "/login/magic-link?error=" + encodeURIComponent("Network error"),
      );
    }
  })
  .get("/magic-link", async (c) => {
    const token = c.req.query("token");

    if (!token) {
      return c.redirect(
        "/login?error=" + encodeURIComponent("Invalid magic link"),
      );
    }

    try {
      const result = await auth.api.magicLinkVerify({
        body: { token },
        headers: c.req.raw.headers,
        asResponse: true,
      });

      if (!result.ok) {
        const error = await result.json();
        return c.redirect(
          "/login?error=" +
            encodeURIComponent(
              error.message || "Invalid or expired magic link",
            ),
        );
      }

      // Forward cookies from magic link verification
      forwardCookies(result, c);

      return c.redirect(
        "/profile?success=" + encodeURIComponent("Successfully signed in!"),
      );
    } catch (error) {
      console.error(`Error in /magic-link: ${error}`);
      return c.redirect(
        "/login?error=" + encodeURIComponent("Magic link verification failed"),
      );
    }
  })
  .get("/login/passkey", (c) => {
    return c.html(
      Layout({
        title: "Passkey Sign In",
        children: html`
          <h1>Sign In with Passkey</h1>
          ${Navigation({
            back: { href: "/login", text: "Back to Login" },
          })}
          ${Message({
            error: c.req.query("error"),
            success: c.req.query("success"),
          })}
          ${FormSection({
            children: html`
              <form onsubmit="handlePasskeySignIn(event)">
                <div class="form-group">
                  <input
                    type="email"
                    id="passkey-email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <button
                  type="submit"
                  style="background: #6f42c1; color: white;"
                >
                  Sign In with Passkey
                </button>
              </form>
            `,
          })}
        `,
      }),
    );
  });
