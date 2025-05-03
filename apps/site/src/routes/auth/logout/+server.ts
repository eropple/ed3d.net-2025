import { redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

import { clearSessionCookie } from "$lib/server/auth/session/cookie-utils.js";

export const GET: RequestHandler = async ({ locals, cookies, url }) => {
  const logger = locals.logger.child({ fn: "/auth/logout/+server.ts:GET" });

  // Get the session token from the cookie
  const sessionToken = cookies.get(locals.config.auth.session.cookieName);

  if (sessionToken) {
    // Revoke the session in the database
    await locals.deps.sessionService.revokeSession(sessionToken);
  }

  // Clear the session cookie
  clearSessionCookie(cookies, locals.config.auth);

  // Get redirect destination from query parameter (if provided)
  const redirectTo = url.searchParams.get("redirect") || "/";

  logger.info("User logged out successfully");
  throw redirect(302, redirectTo);
};
