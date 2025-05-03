import { error, isRedirect, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

import { SocialOAuth2ProviderKindChecker } from "$lib/server/db/schema/index.js";

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const logger = locals.logger.child({ fn: "/auth/social/[provider]/start/+server.ts:GET" });
  const { provider } = params;
  const redirectPath = url.searchParams.get("redirect") ?? undefined; // Get redirect path from query

  // Validate provider
  if (!SocialOAuth2ProviderKindChecker.Check(provider)) {
    throw error(400, `Unsupported provider: ${provider}`);
  }

  // Validate redirectPath (optional, basic check)
  if (redirectPath && !redirectPath.startsWith("/")) {
      logger.warn({ redirectPath }, "Invalid redirect path query parameter.");
      // Decide whether to error or just ignore it. Ignoring seems safer.
      // throw error(400, "Invalid redirect path.");
  }

  try {
    const userId = locals.user?.userId ?? null;

    // Call the AuthService to get the provider's authorization URL
    const authorizationUrl = await locals.deps.authService.startSocialAuth(
      userId,
      provider,
      redirectPath // Pass the captured redirect path
    );

    // Redirect the user to the provider's authorization page
    throw redirect(302, authorizationUrl);

  } catch (err) {
    // Add check to re-throw redirects
    if (isRedirect(err)) {
      throw err;
    }

    logger.error({ err, provider, redirectPath }, "Error starting social authentication flow");
    // Handle specific errors or provide a generic message
    throw error(500, "Failed to initiate social login. Please try again.");
  }
};