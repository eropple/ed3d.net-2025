import type { Cookies } from "@sveltejs/kit";

import type { AuthConfig } from "../config.js";

/**
 * Set a session cookie
 */
export function setSessionCookie(
  cookies: Cookies,
  token: string,
  expiresAt: Date,
  config: AuthConfig
): void {
  cookies.set(config.session.cookieName, token, {
    path: "/",
    httpOnly: true,
    secure: config.session.secureCookies,
    domain: config.session.cookieDomain || undefined,
    sameSite: "lax",
    expires: expiresAt,
  });
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(
  cookies: Cookies,
  config: AuthConfig
): void {
  cookies.delete(config.session.cookieName, {
    path: "/",
    httpOnly: true,
    secure: config.session.secureCookies,
    domain: config.session.cookieDomain || undefined,
  });
}
