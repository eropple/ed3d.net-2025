import { error, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, url }) => {
  const logger = locals.logger.child({ fn: "/auth/atproto/authorize/+server.ts:GET" });

  // Get handle from query parameter
  const handle = url.searchParams.get("handle");
  if (!handle) {
    throw error(400, "Missing handle parameter");
  }

  try {
    // Get user ID if user is logged in, undefined otherwise
    const userId = locals.user?.userId;

    // Generate authorization URL using ATProto service
    const authUrl = await locals.deps.authService.startATProtoAuth(userId, handle);

    throw redirect(302, authUrl);
  } catch (err) {
    logger.error({ err }, "Error starting ATProto auth");
    throw error(500, "Failed to start authentication");
  }
};
