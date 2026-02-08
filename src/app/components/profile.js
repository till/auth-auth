import { html } from "hono/html";
import { format } from "date-fns";

// User info display
export const UserInfo = ({ user }) => html`
  <h2>User Information</h2>
  <p><strong>Name:</strong> ${user.name}</p>
  <p><strong>Email:</strong> ${user.email}</p>
  <p><strong>ID:</strong> ${user.id}</p>
  <p><strong>Email Verified:</strong> ${user.emailVerified ? "Yes" : "No"}</p>
  <p>
    <strong>Created:</strong> ${format(
      new Date(user.createdAt),
      "yyyy-MM-dd HH:mm:ss",
    )}
  </p>
`;
