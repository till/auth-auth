// TODO: we need a bundler, so we can re-use what we have in node_modules already
import { createAuthClient } from "https://esm.sh/better-auth@latest/client";
import { passkeyClient } from "https://esm.sh/better-auth@latest/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [passkeyClient()],
});

export const { passkey, signIn, signUp } = authClient;

const handlePasskeySignIn = async (event) => {
  event.preventDefault();
  const email = document.getElementById("passkey-email").value;
  const form = event.target;
  const redirectUrl = form.dataset.redirectUrl || "/profile";

  let errorCallbackUrl = "/login/passkey";
  if (redirectUrl != "/profile") {
    errorCallbackUrl += `?redirect_url=${encodeURIComponent(redirectUrl)}`;
  }

  try {
    await authClient.signIn.passkey({
      email,
      callbackURL: redirectUrl,
      errorCallbackURL: errorCallbackUrl,
    });
    // better-auth should handle the redirect, but fallback just in case
    window.location.href =
      redirectUrl + "?success=" + encodeURIComponent("Signed in with passkey!");
  } catch (error) {
    console.error("Passkey sign in failed:", error);

    let errorUrl = `"/login/passkey?error=${encodeURIComponent("Passkey sign in failed: " + error.message)}`;
    if (redirectUrl && redirectUrl !== "/profile") {
      errorUrl = `&redirect_url=${encodeURIComponent(redirectUrl)}`;
    }
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
      "/profile?success=" + encodeURIComponent("Passkey added successfully!");
  } catch (error) {
    console.error("Add passkey failed:", error);
    window.location.href =
      "/profile?error=" +
      encodeURIComponent("Failed to add passkey: " + error.message);
  }
};

const handleGitHubSignIn = async (event) => {
  event.preventDefault();
  const button = event.target;
  const redirectUrl = button.dataset.redirectUrl || "/profile";

  try {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: redirectUrl,
    });
  } catch (error) {
    console.error("GitHub sign in failed:", error);
    window.location.href =
      "/login?error=" +
      encodeURIComponent("GitHub sign in failed: " + error.message);
  }
};

// Attach event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.handleGitHubSignIn = handleGitHubSignIn;

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
