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
    throw error(400, "Invalid callback parameters");
  }

  let validatedRedirectPath = fallbackRedirectPath; // Initialize with fallback

  try {
    // Handle the callback - this now returns { user, state }
    const { user, state } = await locals.deps.authService.handleSocialCallback(
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

    // Redirect using the validated path
    logger.info({ userId: user.userId, redirectPath: validatedRedirectPath }, "Social login successful, redirecting.");
    throw redirect(302, validatedRedirectPath);

  } catch (err) {

    if (isRedirect(err)) {
      throw err;
    }
    if (isHttpError(err)) {
			throw err;
		}

    // Check for unique constraint violation
    if (isDatabaseError(err) && err.code === "23505") {
      logger.warn({ provider, err }, "Social account already linked to another user.");
      // Use flashRedirect for error case
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      // Note: We don't have the validated state here in the catch block easily.
      // Redirecting to fallback path for this specific error case might be acceptable.
      // Or we could decrypt state again here, but that adds complexity.
      throw flashRedirect(
        fallbackRedirectPath, // Using fallback on unique constraint error for simplicity
        { type: "error", message: `This ${providerName} account is already linked to another user.` },
        cookies
      );
    }

    // Handle other errors
    logger.error({ err, provider }, "Error handling social callback");
    throw error(500, "Authentication failed. Please try again.");
  }
};