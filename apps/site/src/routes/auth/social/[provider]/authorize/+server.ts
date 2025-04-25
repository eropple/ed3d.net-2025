import { error, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

import { SocialOAuth2ProviderKindChecker } from "$lib/server/db/schema/index.js";

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const logger = locals.logger.child({ fn: "/auth/social/[provider]/authorize/+server.ts:GET" });
  const { provider } = params;

  // Validate provider
  if (!SocialOAuth2ProviderKindChecker.Check(provider)) {
    throw error(400, `Unsupported provider: ${provider}`);
  }

  try {
    // Get user ID if user is logged in, undefined otherwise
    const userId = locals.user?.userId;

    // Start social auth flow
    const authUrl = await locals.deps.authService.startSocialAuth(userId, provider);

    throw redirect(302, authUrl);
  } catch (err) {
    logger.error({ err }, "Error starting social auth");
    throw error(500, "Failed to start authentication");
  }
};