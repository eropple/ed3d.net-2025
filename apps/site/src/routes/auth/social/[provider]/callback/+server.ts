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

  // Validate provider
  if (!SocialOAuth2ProviderKindChecker.Check(provider)) {
    throw error(400, `Unsupported provider: ${provider}`);
  }

  // Get the code and state from query parameters
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    logger.error({ provider }, "Missing code or state parameter in social callback");
    throw error(400, "Invalid callback parameters");
  }

  try {
    // Handle the callback using the auth service
    const { userId } = await locals.deps.authService.handleSocialCallback(
      provider,
      code,
      state
    );

    // Create a session for the user
    const { token, expiresAt } = await locals.deps.sessionService.createSession(userId);

    // Set the session cookie
    setSessionCookie(logger, cookies, token, expiresAt, locals.config.auth);

    // Use standard SvelteKit redirect for success (no flash message needed)
    throw redirect(302, "/profile");

  } catch (err) {
    // Check for redirects first (including the SvelteKit one we just threw)
    if (isRedirect(err)) {
      throw err;
    }
    // Check for explicit HTTP errors thrown by SvelteKit's error()
    if (isHttpError(err)) {
			throw err;
		}

    // Check for unique constraint violation (PostgreSQL code '23505')
    if (isDatabaseError(err) && err.code === "23505") {
      logger.warn({ provider, err }, "Social account already linked to another user.");
      // Use flashRedirect for error case where message IS needed
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      // Use the signature: flashRedirect(location, message, cookies) - defaults to 303 status
      throw flashRedirect(
        "/profile",
        { type: "error", message: `This ${providerName} account is already linked to another user.` },
        cookies
      );
    }

    // Handle other errors
    logger.error({ err, provider }, "Error handling social callback");
    throw error(500, "Authentication failed. Please try again.");
  }
};