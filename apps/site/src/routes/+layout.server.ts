import type { LayoutServerLoad } from "./$types";

/**
 * Root layout load function that exposes the authenticated user to all pages
 * This makes the user available in all routes via $page.data.user
 */
export const load: LayoutServerLoad = async ({ locals }) => {
  // Extract the user from locals
  const { user } = locals;

  // Return the user as part of the layout data
  return {
    user
  };
};