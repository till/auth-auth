import { Hono } from "hono";
import { html } from "hono/html";
import { Layout, Navigation } from "../components/layout.js";
import { Message, FormSection } from "../components/common.js";
import { Login, MagicLinkButton, PasskeyButton } from "../components/login.js";
import { auth } from "../../../auth.js";
import { getLink } from "../utils/links.js";
import { validateRedirectUrl } from "../utils/redirect.js";
import { forwardCookies } from "../utils/cookies.js";
import { logout } from "../handlers/logout.js";

export default new Hono()
  .get("/login", (c) => {
    // Login page
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
              ${PasskeyButton({ action: "signin", redirectUrl })}
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
            `,
          })}
        `,
      }),
    );
  })
  .post("/signup", async (c) => {
    // Sign up form handler
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

    // forward headers (cookies)
    if (status.headers) {
      forwardCookies(status.headers, c);
    }

    return c.redirect(callbackURL);
  })
  .post("/login", async (c) => {
    // Sign in form handler
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
    // forward headers (cookies)
    if (status.headers) {
      forwardCookies(status.headers, c);
    }

    return c.redirect(status.response.url);
  })
  .get("/logout", logout)
  .post("/logout", logout)
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
          ${Message({
            error: c.req.query("error"),
            success: c.req.query("success"),
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
                    placeholder="Enter your email"
                    required
                  />
                </fieldset>
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
    const { email, redirect_url } = body;

    const intermediateURL = `/login/magic-link?success=${encodeURIComponent("Magic link sent! Check your email.")}`;

    const callbackURL = validateRedirectUrl(redirect_url, "/profile");
    const errorCallbackURL = validateRedirectUrl(
      redirect_url,
      "/login/magic-link",
    );

    await auth.api.signInMagicLink({
      body: {
        email,
        callbackURL,
        errorCallbackURL,
      },
      headers: c.req.raw.headers,
    });
    return c.redirect(intermediateURL);
  })
  .get("/login/passkey", (c) => {
    const redirectUrl = validateRedirectUrl(c.req.query("redirect_url"), "");

    return c.html(
      Layout({
        title: "Passkey Sign In",
        children: html`
          <h1>Sign In with Passkey</h1>
          ${Navigation({
            back: {
              href: getLink("/login", redirectUrl),
              text: "Back to Login",
            },
          })}
          ${Message({
            error: c.req.query("error"),
            success: c.req.query("success"),
          })}
          ${FormSection({
            children: html`
              <form
                onsubmit="handlePasskeySignIn(event)"
                data-redirect-url="${redirectUrl}"
              >
                <fieldset>
                  <input
                    type="email"
                    id="passkey-email"
                    placeholder="Enter your email"
                    required
                  />
                </fieldset>
                <button type="submit">Sign In with Passkey</button>
              </form>
            `,
          })}
        `,
      }),
    );
  });
