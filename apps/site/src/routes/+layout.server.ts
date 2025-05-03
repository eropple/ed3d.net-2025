import { loadFlash } from "sveltekit-flash-message/server"; // Import loadFlash

import type { LayoutServerLoad } from "./$types";

/**
 * Root layout load function that exposes the authenticated user to all pages
 * This makes the user available in all routes via $page.data.user
 */
// Wrap the existing load function with loadFlash
export const load: LayoutServerLoad = loadFlash(async ({ locals }) => {
  const logger = locals.logger.child({ fn: "/+layout.server.ts:load" });
  const { user } = locals;


  return {
    user
    // flash message is automatically added by loadFlash wrapper
  };
});