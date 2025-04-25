import { error, redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, url }) => {
  const logger = locals.logger.child({ fn: "/auth/atproto/authorize/+server.ts:GET" });

  // Check if user is logged in
  if (!locals.user) {
    throw redirect(302, `/login?callback=/auth/atproto/authorize${url.search}`);
  }

  // Get handle from query parameter
  const handle = url.searchParams.get("handle");
  if (!handle) {
    throw error(400, "Missing handle parameter");
  }

  try {
    // Generate authorization URL using ATProto service
    const authUrl = await locals.deps.authService.startATProtoAuth(
      locals.user.userId,
      handle
    );

    throw redirect(302, authUrl);
  } catch (err) {
    logger.error({ err }, "Error starting ATProto auth");
    throw error(500, "Failed to start authentication");
  }
};
