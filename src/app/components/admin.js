import { html } from "hono/html";

// Swedish locale uses ISO8601 dates
const locale = "se-se";

// Admin users list component
export const UsersList = ({ users, total }) => html`
  <div class="form-section">
    <h3>Users (${total} total)</h3>
    ${users && users.length > 0
      ? html`
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Verified</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(
                (user) => html`
                  <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.emailVerified ? "✅" : "❌"}</td>
                    <td>
                      <form method="post" action="/admin/user/role">
                        <input type="hidden" name="userId" value="${user.id}" />
                        <select name="role" onchange="this.form.submit()">
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
                    <td>
                      ${new Date(user.createdAt).toLocaleDateString(locale)}
                    </td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        `
      : html` <p>No users found.</p> `}
  </div>
`;
