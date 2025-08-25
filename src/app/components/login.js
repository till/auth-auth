import { html } from "hono/html";

// Login form component
export const Login = () => html`
  <form method="post" action="/signin">
    <div class="form-group">
      <input type="email" name="email" placeholder="Email" required />
    </div>
    <div class="form-group">
      <input type="password" name="password" placeholder="Password" required />
    </div>
    <button type="submit">Sign In</button>
  </form>
`;

// Magic link button component
export const MagicLinkButton = () => html`
  <div style="text-align: center; margin: 20px 0;">
    <span style="color: #666;">or</span>
  </div>

  <form method="get" action="/login/magic-link">
    <button type="submit" style="background: #28a745; width: 100%;">
      Send Magic Link
    </button>
  </form>
`;

// Passkey button component
export const PasskeyButton = ({ action = "signin" }) => html`
  <form
    method="get"
    action="${action === "signup" ? "/signup/passkey" : "/login/passkey"}"
  >
    <button
      type="submit"
      style="background: #6f42c1; width: 100%; color: white;"
    >
      ${action === "signup" ? "Sign Up with Passkey" : "Sign In with Passkey"}
    </button>
  </form>
`;
