import { html } from "hono/html";

// Admin users list component
export const UsersList = ({ users, total }) => html`
  <div class="form-section">
    <h3>Users (${total} total)</h3>
    ${users && users.length > 0
      ? html`
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th
                    style="border: 1px solid #ddd; padding: 8px; text-align: left;"
                  >
                    Name
                  </th>
                  <th
                    style="border: 1px solid #ddd; padding: 8px; text-align: left;"
                  >
                    Email
                  </th>
                  <th
                    style="border: 1px solid #ddd; padding: 8px; text-align: left;"
                  >
                    Verified
                  </th>
                  <th
                    style="border: 1px solid #ddd; padding: 8px; text-align: left;"
                  >
                    Role
                  </th>
                  <th
                    style="border: 1px solid #ddd; padding: 8px; text-align: left;"
                  >
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                ${users.map(
                  (user) => html`
                    <tr>
                      <td style="border: 1px solid #ddd; padding: 8px;">
                        ${user.name}
                      </td>
                      <td style="border: 1px solid #ddd; padding: 8px;">
                        ${user.email}
                      </td>
                      <td style="border: 1px solid #ddd; padding: 8px;">
                        ${user.emailVerified ? "✅" : "❌"}
                      </td>
                      <td style="border: 1px solid #ddd; padding: 8px;">
                        <form
                          method="post"
                          action="/admin/user/role"
                          style="margin: 0;"
                        >
                          <input
                            type="hidden"
                            name="userId"
                            value="${user.id}"
                          />
                          <select
                            name="role"
                            onchange="this.form.submit()"
                            style="padding: 4px; border: 1px solid #ccc; border-radius: 3px;"
                          >
                            <option
                              value="user"
                              ${user.role === "user" ? "selected" : ""}
                            >
                              User
                            </option>
                            <option
                              value="admin"
                              ${user.role === "admin" ? "selected" : ""}
                            >
                              Admin
                            </option>
                          </select>
                        </form>
                      </td>
                      <td style="border: 1px solid #ddd; padding: 8px;">
                        ${new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  `,
                )}
              </tbody>
            </table>
          </div>
        `
      : html` <p>No users found.</p> `}
  </div>
`;
