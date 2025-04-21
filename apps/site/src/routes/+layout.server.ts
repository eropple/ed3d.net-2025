import type { LayoutServerLoad } from "./$types";

/**
 * Root layout load function that exposes the authenticated user to all pages
 * This makes the user available in all routes via $page.data.user
 */
export const load: LayoutServerLoad = async ({ locals }) => {
  const logger = locals.logger.child({ fn: "/+layout.server.ts:load" });
  const { user } = locals;


  return {
    user
  };
};