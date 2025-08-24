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
    
    <script type="module">
      import { createAuthClient } from "https://esm.sh/better-auth@latest/client";
      import { passkeyClient } from "https://esm.sh/better-auth@latest/client/plugins";

      const authClient = createAuthClient({
        baseURL: "http://localhost:3000",
        plugins: [passkeyClient()]
      });

      const handlePasskeySignIn = async (event) => {
        event.preventDefault();
        const email = document.getElementById('passkey-email').value;
        
        try {
          await authClient.signIn.passkey({ email });
          window.location.href = '/profile?success=' + encodeURIComponent('Signed in with passkey!');
        } catch (error) {
          console.error('Passkey sign in failed:', error);
          window.location.href = '/login/passkey?error=' + encodeURIComponent('Passkey sign in failed: ' + error.message);
        }
      }


      const handleAddPasskey = async (event) => {
        event.preventDefault();
        const email = document.getElementById('user-email').value;
        const name = document.getElementById('user-name').value;
        
        try {
          await authClient.passkey.addPasskey({ email, name });
          window.location.href = '/profile?success=' + encodeURIComponent('Passkey added successfully!');
        } catch (error) {
          console.error('Add passkey failed:', error);
          window.location.href = '/profile?error=' + encodeURIComponent('Failed to add passkey: ' + error.message);
        }
      }

      // Attach event listeners
      document.addEventListener('DOMContentLoaded', () => {
        const signInForm = document.querySelector('form[onsubmit*="handlePasskeySignIn"]');
        const addPasskeyForm = document.querySelector('form[onsubmit*="handleAddPasskey"]');
        
        if (signInForm) {
          signInForm.onsubmit = handlePasskeySignIn;
        }

        if (addPasskeyForm) {
          addPasskeyForm.onsubmit = handleAddPasskey;
        }
      });
    </script>
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

// Passkey button component  
export const PasskeyButton = ({ action = 'signin' }) => html`
  <form method="get" action="${action === 'signup' ? '/signup/passkey' : '/login/passkey'}">
    <button 
      type="submit" 
      style="background: #6f42c1; width: 100%; color: white;"
    >
      ${action === 'signup' ? 'Sign Up with Passkey' : 'Sign In with Passkey'}
    </button>
  </form>
`

// Passkey list component
export const PasskeyList = ({ passkeys }) => html`
  ${passkeys && passkeys.length > 0 ? html`
    <div class="form-section">
      <h3>Your Passkeys</h3>
      ${passkeys.map(passkey => html`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0;">
          <div>
            <strong>${passkey.name || 'Unnamed Passkey'}</strong>
            <br>
            <small style="color: #666;">Created: ${new Date(passkey.createdAt).toLocaleDateString()}</small>
          </div>
          <form method="post" action="/profile/passkey/delete" style="margin: 0;">
            <input type="hidden" name="passkeyId" value="${passkey.id}" />
            <button type="submit" style="background: #dc3545; color: white; padding: 5px 10px; font-size: 12px;">
              Delete
            </button>
          </form>
        </div>
      `)}
    </div>
  ` : ''}
`

// Add passkey component for profile page
export const AddPasskeySection = ({ user }) => html`
  <div class="form-section">
    <h3>Passkey Security</h3>
    <p>Add a passkey to your account for secure, passwordless authentication.</p>
    
    <form onsubmit="handleAddPasskey(event)" style="margin-top: 20px;">
      <input type="hidden" id="user-email" value="${user.email}" />
      <input type="hidden" id="user-name" value="${user.name}" />
      <button type="submit" style="background: #6f42c1; color: white; padding: 12px 24px;">
        Add Passkey to Account
      </button>
    </form>
  </div>
`
