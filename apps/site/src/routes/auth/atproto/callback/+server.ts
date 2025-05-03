import { error, isHttpError, isRedirect, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

import { setSessionCookie } from "$lib/server/auth/session/cookie-utils.js";

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  const logger = locals.logger.child({ fn: "/auth/atproto/callback/+server.ts:GET" });

  try {
    // Handle the callback using the auth service
    const { userId } = await locals.deps.authService.handleATProtoCallback(url.searchParams);

    // Create a session for the user
    const { token, expiresAt } = await locals.deps.sessionService.createSession(userId);

    // Set the session cookie
    setSessionCookie(logger, cookies, token, expiresAt, locals.config.auth);

    // Get the redirect destination from state parameter (if it exists)
    const state = url.searchParams.get("state");
    let redirectTo = "/profile";

    if (state) {
      try {
        // Check if state contains redirect information
        const stateData = JSON.parse(decodeURIComponent(state));
        if (stateData.redirect) {
          redirectTo = stateData.redirect;
        }
      } catch (e) {
        // Invalid state parameter, use default redirect
        logger.warn({ state }, "Invalid state parameter in ATProto callback");
      }
    }

    // Redirect to the target page
    throw redirect(302, redirectTo);
  } catch (err) {
    if (isRedirect(err) || isHttpError(err)) {
      throw err;
    }

    logger.error({ err }, "Error handling ATProto callback");
    throw error(500, "Authentication failed. Please try again.");
  }
};