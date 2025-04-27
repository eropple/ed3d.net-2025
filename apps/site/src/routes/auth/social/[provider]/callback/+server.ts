import { error, isRedirect, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

import { setSessionCookie } from "$lib/server/auth/session/cookie-utils.js";
import { SocialOAuth2ProviderKindChecker } from "$lib/server/db/schema/index.js";

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

    // Redirect to profile page after successful authentication
    throw redirect(302, "/profile");
  } catch (err) {
    if (isRedirect(err)) {
      throw err;
    }

    logger.error({ err, provider }, "Error handling social callback");
    throw error(500, "Authentication failed. Please try again.");
  }
};