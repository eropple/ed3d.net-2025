import type { Cookies } from "@sveltejs/kit";
import type { Logger } from "pino";
import type { DeepReadonly } from "utility-types";

import type { AuthConfig } from "../config.js";

/**
 * Set a session cookie
 */
export function setSessionCookie(
  logger: Logger,
  cookies: Cookies,
  token: string,
  expiresAt: Date,
  config: DeepReadonly<AuthConfig>
): void {
  logger.fatal({ authConfig: config }, "Setting session cookie");
  const httpOnly = true;
  const secure = config.session.secureCookies;
  const domain = config.session.cookieDomain || undefined;
  const sameSite = "lax";
  const expires = expiresAt;

  logger.debug({ expiresAt, httpOnly, secure, domain, sameSite, expires }, "Setting session cookie");

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
