import { html } from 'hono/html'

// Base layout component
export const Layout = ({ title, children }) => html`
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title}</title>
    <link rel="stylesheet" href="/static/app.css">
  </head>
  <body>
    <div class="container">
      ${children}
    </div>
  </body>
  </html>
`

// Navigation component
export const Navigation = ({ back, extra }) => html`
  <a href="${back.href}">← ${back.text}</a>
  ${extra ? html` | <a href="${extra.href}">${extra.text}</a>` : ''}
`

// Message display component
export const Message = ({ error, success }) => html`
  ${error ? html`<div class="error">${decodeURIComponent(error)}</div>` : ''}
  ${success ? html`<div class="success">${decodeURIComponent(success)}</div>` : ''}
`

// Form section wrapper
export const FormSection = ({ children }) => html`
  <div class="form-section">
    ${children}
  </div>
`

// Login status display
export const LoginStatus = ({ user }) => html`
  ${user ? html`
    <div class="status logged-in">
      ✅ Logged in as: <strong>${user.name}</strong> (${user.email})
    </div>
    <a href="/profile">View Profile</a> | 
    <form method="post" action="/logout" style="display: inline;">
      <button type="submit">Logout</button>
    </form>
  ` : html`
    <div class="status logged-out">
      ❌ Not logged in
    </div>
    <a href="/login">Sign In</a> | <a href="/signup">Sign Up</a>
  `}
`

// User info display
export const UserInfo = ({ user }) => html`
  <div class="user-info">
    <h2>User Information</h2>
    <p><strong>Name:</strong> ${user.name}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>ID:</strong> ${user.id}</p>
    <p><strong>Email Verified:</strong> ${user.emailVerified ? 'Yes' : 'No'}</p>
    <p><strong>Created:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
  </div>
`

// Magic link button component
export const MagicLinkButton = () => html`
  <div style="text-align: center; margin: 20px 0;">
    <span style="color: #666;">or</span>
  </div>

  <form method="get" action="/login/magic-link">
    <button type="submit" style="background: #28a745; width: 100%;">Send Magic Link</button>
  </form>
`
