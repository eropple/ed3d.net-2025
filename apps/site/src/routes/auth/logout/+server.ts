import type { RequestHandler } from "./$types";

/**
 * Route that handles user logout
 * Revokes the session and clears the session cookie
 */
export const GET: RequestHandler = async ({ cookies, url, locals }) => {
  const logger = locals.logger.child({
    route: "auth/logout"
  });

  const authService = locals.deps.auth;
  const cookieName = locals.deps.config.auth.session.cookieName;

  // Get the session token from the cookie
  const sessionToken = cookies.get(cookieName);

  // Get the redirect_uri from the query parameters (where to send the user after logout)
  const redirectUri = url.searchParams.get("redirect_uri") || "/";

  // If we have a session token, revoke it
  if (sessionToken) {
    try {
      await authService.revokeSession(sessionToken);
    } catch (err) {
      logger.error({ err }, "Error revoking session:");
    }
  }

  // Clear the session cookie
  cookies.set(cookieName, "", {
    path: "/",
    expires: new Date(0),
  });

  // Redirect the user to the specified redirect URI or homepage
  return new Response(null, {
    status: 302,
    headers: {
      location: redirectUri
    }
  });
};