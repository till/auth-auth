import { html } from "hono/html";

// User info display
export const UserInfo = ({ user }) => html`
  <div class="user-info">
    <h2>User Information</h2>
    <p><strong>Name:</strong> ${user.name}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>ID:</strong> ${user.id}</p>
    <p><strong>Email Verified:</strong> ${user.emailVerified ? "Yes" : "No"}</p>
    <p>
      <strong>Created:</strong> ${new Date(user.createdAt).toLocaleString()}
    </p>
  </div>
`;

// Passkey list component
export const PasskeyList = ({ passkeys }) => html`
  ${passkeys && passkeys.length > 0
    ? html`
        <div class="form-section">
          <h3>Your Passkeys</h3>
          ${passkeys.map(
            (passkey) => html`
              <div
                style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0;"
              >
                <div>
                  <strong>${passkey.name || "Unnamed Passkey"}</strong>
                  <br />
                  <small style="color: #666;"
                    >Created:
                    ${new Date(passkey.createdAt).toLocaleDateString()}</small
                  >
                </div>
                <form
                  method="post"
                  action="/profile/passkey/delete"
                  style="margin: 0;"
                >
                  <input type="hidden" name="passkeyId" value="${passkey.id}" />
                  <button
                    type="submit"
                    style="background: #dc3545; color: white; padding: 5px 10px; font-size: 12px;"
                  >
                    Delete
                  </button>
                </form>
              </div>
            `,
          )}
        </div>
      `
    : ""}
`;

// Add passkey component for profile page
export const AddPasskeySection = ({ user }) => html`
  <div class="form-section">
    <h3>Passkey Security</h3>
    <p>
      Add a passkey to your account for secure, passwordless authentication.
    </p>

    <form onsubmit="handleAddPasskey(event)" style="margin-top: 20px;">
      <input type="hidden" id="user-email" value="${user.email}" />
      <input type="hidden" id="user-name" value="${user.name}" />
      <button
        type="submit"
        style="background: #6f42c1; color: white; padding: 12px 24px;"
      >
        Add Passkey to Account
      </button>
    </form>
  </div>
`;
