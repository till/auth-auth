import config from "../../../config.js";

/**
 * Checks if a redirect URL is valid (in the allowlist)
 * @param {string} redirectUrl - The URL to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidRedirectUrl = (redirectUrl) => {
  if (!redirectUrl || typeof redirectUrl !== "string") {
    return false;
  }

  const trimmed = redirectUrl.trim();
  if (!trimmed) {
    return false;
  }

  return config.allowed_redirects.includes(trimmed);
};

/**
 * Validates a redirect URL against the allowlist and returns a safe redirect URL
 * @param {string} redirectUrl - The URL to validate
 * @param {string} fallback - Fallback URL if validation fails (default: '/profile')
 * @returns {string} - Safe redirect URL
 */
export const validateRedirectUrl = (redirectUrl, fallback = "/profile") => {
  return isValidRedirectUrl(redirectUrl) ? redirectUrl.trim() : fallback;
};
