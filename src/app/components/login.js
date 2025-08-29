import { html } from "hono/html";

// Login form component
export const Login = ({ redirectUrl } = {}) => html`
  <h2>Using email and password</h2>
  <form method="post" action="/login">
    <input type="hidden" name="redirect_url" value="${redirectUrl}" />
    <fieldset role="group">
      <input type="email" name="email" placeholder="Email" required />
      <input type="password" name="password" placeholder="Password" required />
      <input type="submit" value="Sign In" />
    </fieldset>
  </form>
`;

// Magic link button component
export const MagicLinkButton = ({ redirectUrl } = {}) => html`
  <h2>Using magic link</h2>
  <form method="get" action="/login/magic-link">
    <input type="hidden" name="redirect_url" value="${redirectUrl}" />
    <button type="submit">Send Magic Link</button>
  </form>
`;

// Passkey button component
export const PasskeyButton = ({ action = "signin", redirectUrl } = {}) => html`
  <h2>Using Passkeys</h2>
  <form
    method="get"
    action="${action === "signup" ? "/signup/passkey" : "/login/passkey"}"
  >
    <input type="hidden" name="redirect_url" value="${redirectUrl}" />
    <button type="submit">
      ${action === "signup" ? "Sign Up with Passkey" : "Sign In with Passkey"}
    </button>
  </form>
`;
