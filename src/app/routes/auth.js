import { Hono } from "hono";
import { html } from "hono/html";
import { Layout, Navigation } from "../components/layout.js";
import { Message, FormSection } from "../components/common.js";
import { GitHubButton, MagicLinkButton } from "../components/login.js";
import { getLink } from "../utils/links.js";
import { validateRedirectUrl } from "../utils/redirect.js";
import { getAuthFromContext } from "../utils/auth.js";
import { logout } from "../handlers/logout.js";

export default new Hono()
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
          })}
          ${Message({ error, success })}
          ${FormSection({
            children: html`
              ${MagicLinkButton({ redirectUrl })}
              ${GitHubButton({ redirectUrl })}
            `,
          })}
        `,
      }),
    );
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
    const auth = getAuthFromContext(c);
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
  });
