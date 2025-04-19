import { error } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

/**
 * Route that handles the OIDC callback from the identity provider
 * Processes the authorization code, creates or updates the user,
 * creates a session, and redirects to the appropriate page
 */
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  const logger = locals.logger.child({
    route: "auth/callback"
  });

  const authService = locals.deps.auth;

  // Get the state and code from the query parameters
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  // Verify that we have all required parameters
  if (!state || !code) {
    throw error(400, "Missing required OIDC parameters");
  }

  try {
    // Handle the OIDC callback
    const { sessionToken, redirectTo } = await authService.TX_handleOIDCCallback(
      state,
      url
    );

    // Set the session cookie
    cookies.set(locals.deps.config.auth.session.cookieName, sessionToken, {
      path: "/",
      httpOnly: true,
      secure: locals.deps.config.auth.session.cookieSecure,
      sameSite: locals.deps.config.auth.session.cookieSameSite || "lax",
      maxAge: Math.floor(locals.deps.config.auth.session.maxAgeMs / 1000) // Convert ms to seconds
    });

    // Redirect the user to the specified redirect URI or default URL
    return new Response(null, {
      status: 302,
      headers: {
        location: redirectTo
      }
    });
  } catch (err) {
    logger.error({ err }, "OIDC callback error.");
    throw error(500, "Authentication failed");
  }
};