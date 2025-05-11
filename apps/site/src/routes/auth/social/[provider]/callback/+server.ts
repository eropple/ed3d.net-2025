import { error, isHttpError, isRedirect, redirect } from "@sveltejs/kit";
import { redirect as flashRedirect } from "sveltekit-flash-message/server";

import type { RequestHandler } from "./$types";

import { setSessionCookie } from "$lib/server/auth/session/cookie-utils.js";
import { SocialOAuth2ProviderKindChecker } from "$lib/server/db/schema/index.js";

// Define the expected DB error structure (adjust if using a different driver)
interface DatabaseError extends Error {
	code?: string;
	constraint?: string;
}

function isDatabaseError(err: unknown): err is DatabaseError {
	return typeof err === "object" && err !== null && ("code" in err || "constraint" in err);
}

export const GET: RequestHandler = async ({ params, url, locals, cookies }) => {
  const logger = locals.logger.child({ fn: "/auth/social/[provider]/callback/+server.ts:GET" });
  const { provider } = params;
  const fallbackRedirectPath = "/profile"; // Define fallback

  // Validate provider
  if (!SocialOAuth2ProviderKindChecker.Check(provider)) {
    throw error(400, `Unsupported provider: ${provider}`);
  }

  // Get code and state token
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state");

  if (!code || !stateToken) {
    logger.error({ provider }, "Missing code or state parameter in social callback");
    // Consider using flashRedirect for user-facing errors on /login page
    throw flashRedirect("/login", { type: "error", message: "Invalid callback parameters. Please try logging in again." }, cookies);
  }

  let validatedRedirectPath = fallbackRedirectPath; // Initialize with fallback

  try {
    // Handle the callback - this now returns { user, state, flash }
    const { user, state, flash: successFlashMessage } = await locals.deps.authService.handleSocialCallback(
      provider,
      code,
      stateToken
    );

    if (state.redirectPath && state.redirectPath.startsWith("/")) {
      validatedRedirectPath = state.redirectPath;
      logger.debug({ validatedRedirectPath }, "Using redirect path from state.");
    } else if (state.redirectPath) {
      logger.warn({ stateRedirectPath: state.redirectPath }, "Invalid redirect path found in state, using fallback.");
    } else {
      logger.debug("No redirect path found in state, using fallback.");
    }

    const { token, expiresAt } = await locals.deps.sessionService.createSession(user.userId);

    // Set the session cookie
    setSessionCookie(logger, cookies, token, expiresAt, locals.config.auth);

    logger.info({ userId: user.userId, redirectPath: validatedRedirectPath, hasFlash: !!successFlashMessage }, "Social login successful, redirecting.");
    // Use flashRedirect, passing the successFlashMessage (which might be undefined)
    throw flashRedirect(validatedRedirectPath, successFlashMessage, cookies);

  } catch (err) {
    // Ensure redirects from authService (if any in future) or flashRedirects are re-thrown
    if (isRedirect(err)) {
      throw err;
    }
    // SvelteKit HTTP errors should also be re-thrown
    if (isHttpError(err)) {
			throw err;
		}

    // Check for unique constraint violation (social account linked to other user)
    if (isDatabaseError(err) && err.code === "23505") {
      logger.warn({ provider, err }, "Social account already linked to another user.");
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      // Redirect to login or a more specific error page if preferred
      throw flashRedirect(
        "/login", // Redirecting to login on this specific error
        { type: "error", message: `This ${providerName} account is already linked to another user.` },
        cookies
      );
    }

    // Handle other generic errors
    logger.error({ err, provider }, "Error handling social callback");
    // Redirect to login page with a generic error message
    throw flashRedirect("/login", { type: "error", message: "Authentication failed. Please try again later." }, cookies);
  }
};