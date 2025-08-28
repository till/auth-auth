import { html } from "hono/html";

// Swedish locale uses ISO8601 dates
const locale = "se-se";

// User info display
export const UserInfo = ({ user }) => html`
  <h2>User Information</h2>
  <p><strong>Name:</strong> ${user.name}</p>
  <p><strong>Email:</strong> ${user.email}</p>
  <p><strong>ID:</strong> ${user.id}</p>
  <p><strong>Email Verified:</strong> ${user.emailVerified ? "Yes" : "No"}</p>
  <p>
    <strong>Created:</strong> ${new Date(user.createdAt).toLocaleString(locale)}
  </p>
`;

// Passkey list component
export const PasskeyList = ({ passkeys }) => html`
  ${passkeys && passkeys.length > 0
    ? html`
        <h3>Your Passkeys</h3>
        ${passkeys.map(
          (passkey) => html`
            <div>
              <strong>${passkey.name || "Unnamed Passkey"}</strong>
              <br />
              <small
                >Created:
                ${new Date(passkey.createdAt).toLocaleDateString()}</small
              >
            </div>
            <form method="post" action="/profile/passkey/delete">
              <input type="hidden" name="passkeyId" value="${passkey.id}" />
              <button type="submit">Delete</button>
            </form>
          `,
        )}
      `
    : ""}
`;

// Add passkey component for profile page
export const AddPasskeySection = ({ user }) => html`
  <h3>Passkey Security</h3>
  <p>Add a passkey to your account for secure, passwordless authentication.</p>

  <form onsubmit="handleAddPasskey(event)">
    <input type="hidden" id="user-email" value="${user.email}" />
    <input type="hidden" id="user-name" value="${user.name}" />
    <button type="submit">Add Passkey to Account</button>
  </form>
`;
