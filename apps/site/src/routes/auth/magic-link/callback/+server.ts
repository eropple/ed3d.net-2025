import { error, isHttpError, isRedirect, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

import { setSessionCookie } from "$lib/server/auth/session/cookie-utils.js";

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  const logger = locals.logger.child({ route: "/auth/magic-link/callback" });
  const token = url.searchParams.get("token");

  if (!token) {
    logger.warn("Magic link callback received without token");
    throw error(400, "Invalid or missing magic link token.");
  }

  try {
    const result = await locals.deps.authService.verifyMagicLink(token);

    if (!result) {
      logger.info("Magic link verification failed (invalid, expired, or used token)");
      throw error(401, "Invalid or expired magic link.");
    }

    const redirectPath = result.redirectPath;

    logger.info({ userId: result.user.userId, type: result.type, redirectPath }, "Magic link verified successfully");

    if (result.type === "login" && result.session) {
      setSessionCookie(logger, cookies, result.session.token, result.session.expiresAt, locals.config.auth);
      logger.info({ userId: result.user.userId }, "Session cookie set after magic link login");
      throw redirect(302, redirectPath);
    } else if (result.type === "verify") {
      logger.info({ userId: result.user.userId }, "Email verified via magic link");
      const verifyRedirectUrl = new URL(redirectPath, url.origin);
      verifyRedirectUrl.searchParams.set("verified", "true");
      throw redirect(302, verifyRedirectUrl.pathname + verifyRedirectUrl.search);
    } else {
      logger.error({ result }, "Unexpected result structure from verifyMagicLink");
      throw error(500, "An unexpected error occurred during login.");
    }

  } catch (err) {
    if (isRedirect(err)) {
      throw err;
    }
    if (isHttpError(err)) {
      throw err;
    }
    logger.error({ err }, "Error processing magic link callback");
    throw error(500, "An internal server error occurred.");
  }
};
