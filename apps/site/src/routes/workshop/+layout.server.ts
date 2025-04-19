import { redirect } from "@sveltejs/kit";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  // Check if user is logged in
  const isAuthenticated = locals.user !== null;

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    throw redirect(302, "/auth/login");
  }

  // This data will be available to all workshop routes
  return {
    user: locals.user
  };
};