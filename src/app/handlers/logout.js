import { validateRedirectUrl } from "../utils/redirect.js";
import { forwardCookies } from "../utils/cookies.js";
import { getAuthFromContext } from "../utils/auth.js";

/**
 * Logout handler
 * @param {import("hono").Context} c
 * @returns
 */
export const logout = async (c) => {
  const auth = getAuthFromContext(c);
  const callbackURL = validateRedirectUrl(
    c.req.query("redirect_url"),
    "/?message=Bye!",
  );
  const status = await auth.api.signOut({
    headers: c.req.raw.headers,
    returnHeaders: true,
  });
  // forward headers (cookies)
  if (status.headers) {
    forwardCookies(status.headers, c);
  }

  return c.redirect(callbackURL);
};
