/**
 * Get auth instance from Hono context with validation
 * @param {import("hono").Context} c - Hono context
 * @returns {import("better-auth").Auth} - Auth instance
 * @throws {Error} If auth is not available in context
 */
export function getAuthFromContext(c) {
  const auth = c.get("auth");
  if (!auth) {
    throw new Error("Auth not available - middleware order issue");
  }
  return auth;
}
