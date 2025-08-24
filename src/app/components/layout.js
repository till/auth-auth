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
