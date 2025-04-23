import { error, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

import { SocialOAuth2ProviderKindChecker } from "$lib/server/db/schema/index.js";

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const logger = locals.logger.child({ fn: "/auth/social/[provider]/authorize/+server.ts:GET" });
  const { provider } = params;

  // Check if user is logged in
  if (!locals.user) {
    throw redirect(302, `/login?callback=/auth/social/${provider}/authorize${url.search}`);
  }

  // Validate provider
  if (!SocialOAuth2ProviderKindChecker.Check(provider)) {
    throw error(400, `Unsupported provider: ${provider}`);
  }

  try {
    const authUrl = await locals.deps.socialIdentityService.getAuthorizationUrl(
      locals.user.userId,
      provider
    );

    throw redirect(302, authUrl);
  } catch (err) {
    logger.error({ err }, "Error starting social auth");
    throw error(500, "Failed to start authentication");
  }
};