import { html } from "hono/html";

// Login status display
export const LoginStatus = ({ user }) => html`
  ${user
    ? html`
        <div class="status logged-in">
          ✅ Logged in as: <strong>${user.name}</strong> (${user.email})
        </div>
        <a href="/profile">View Profile</a> |
        <form method="post" action="/logout" style="display: inline;">
          <button type="submit">Logout</button>
        </form>
      `
    : html`
        <div class="status logged-out">❌ Not logged in</div>
        <a href="/login">Sign In</a> | <a href="/signup">Sign Up</a>
      `}
`;
