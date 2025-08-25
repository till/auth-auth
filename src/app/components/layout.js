import { html } from "hono/html";
import appConfig from "../../../app.js";

// Base layout component
export const Layout = ({ title, children }) => html`
  <!DOCTYPE html>
  <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="/static/app.css" />
    </head>
    <body>
      <div class="container">${children}</div>

      <script type="module">
        import { createAuthClient } from "https://esm.sh/better-auth@latest/client";
        import { passkeyClient } from "https://esm.sh/better-auth@latest/client/plugins";

        const authClient = createAuthClient({
          baseURL: "http://${appConfig.host}:${appConfig.port}",
          plugins: [passkeyClient()],
        });

        const handlePasskeySignIn = async (event) => {
          event.preventDefault();
          const email = document.getElementById("passkey-email").value;
          const form = event.target;
          const redirectUrl = form.dataset.redirectUrl || "/profile";

          try {
            await authClient.signIn.passkey({
              email,
              callbackURL: redirectUrl,
              errorCallbackURL: redirectUrl
                ? "/login/passkey?redirect_url=" +
                  encodeURIComponent(redirectUrl)
                : "/login/passkey",
            });
            // better-auth should handle the redirect, but fallback just in case
            window.location.href =
              redirectUrl +
              "?success=" +
              encodeURIComponent("Signed in with passkey!");
          } catch (error) {
            console.error("Passkey sign in failed:", error);
            const errorUrl =
              redirectUrl && redirectUrl !== "/profile"
                ? "/login/passkey?error=" +
                  encodeURIComponent(
                    "Passkey sign in failed: " + error.message,
                  ) +
                  "&redirect_url=" +
                  encodeURIComponent(redirectUrl)
                : "/login/passkey?error=" +
                  encodeURIComponent(
                    "Passkey sign in failed: " + error.message,
                  );
            window.location.href = errorUrl;
          }
        };

        const handleAddPasskey = async (event) => {
          event.preventDefault();
          const email = document.getElementById("user-email").value;
          const name = document.getElementById("user-name").value;

          try {
            await authClient.passkey.addPasskey({ email, name });
            window.location.href =
              "/profile?success=" +
              encodeURIComponent("Passkey added successfully!");
          } catch (error) {
            console.error("Add passkey failed:", error);
            window.location.href =
              "/profile?error=" +
              encodeURIComponent("Failed to add passkey: " + error.message);
          }
        };

        // Attach event listeners
        document.addEventListener("DOMContentLoaded", () => {
          const signInForm = document.querySelector(
            'form[onsubmit*="handlePasskeySignIn"]',
          );
          const addPasskeyForm = document.querySelector(
            'form[onsubmit*="handleAddPasskey"]',
          );

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
`;
// Navigation component
export const Navigation = ({ back, extra }) => html`
  <a href="${back.href}">← ${back.text}</a>
  ${extra ? html` | <a href="${extra.href}">${extra.text}</a>` : ""}
`;
