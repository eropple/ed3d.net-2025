import { error, isHttpError, isRedirect, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

import { setSessionCookie } from "$lib/server/auth/session/cookie-utils.js";

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  const logger = locals.logger.child({ route: "/auth/magic-link/callback" });
  const token = url.searchParams.get("token");

  if (!token) {
    logger.warn("Magic link callback received without token");
    // Consistent error throwing like other callbacks
    throw error(400, "Invalid or missing magic link token.");
  }

  try {
    const result = await locals.deps.authService.verifyMagicLink(token);

    if (!result) {
      logger.info("Magic link verification failed (invalid, expired, or used token)");
      // Use a generic error like other callbacks, maybe 401?
      throw error(401, "Invalid or expired magic link.");
    }

    logger.info({ userId: result.user.userId, type: result.type }, "Magic link verified successfully");

    // Handle based on link type
    if (result.type === "login" && result.session) {
      // Use the utility function like the other callbacks
      setSessionCookie(logger, cookies, result.session.token, result.session.expiresAt, locals.config.auth);
      logger.info({ userId: result.user.userId }, "Session cookie set after magic link login");
      // Redirect to profile page after successful login
      throw redirect(302, "/profile");
    } else if (result.type === "verify") {
      // Email verification successful
      logger.info({ userId: result.user.userId }, "Email verified via magic link");
      // Redirect to profile page, maybe with a success message?
      // The query param seems useful here to potentially show a toast/message on the profile page.
      throw redirect(302, "/profile?verified=true");
    } else {
      // Should not happen if verifyMagicLink is implemented correctly
      logger.error({ result }, "Unexpected result from verifyMagicLink");
      throw error(500, "An unexpected error occurred during login.");
    }

  } catch (err) {
    if (isRedirect(err) || isHttpError(err)) {
      throw err;
    }

    // Log and throw a generic 500 for other errors
    logger.error({ err }, "Error processing magic link callback");
    throw error(500, "An internal server error occurred.");
  }
};