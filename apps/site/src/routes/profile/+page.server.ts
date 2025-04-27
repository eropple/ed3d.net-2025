import { fail, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

// Load user connections for the profile page
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  const connections = await locals.deps.authService.getUserConnections(locals.user);
  const missingConnections = await locals.deps.authService.getMissingConnections(locals.user);

  return {
    connections,
    missingConnections
  };
};

export const actions: Actions = {
  // Update email action
  updateEmail: async ({ request, locals }) => {
    const logger = locals.logger.child({ action: "/profile:updateEmail" });
    if (!locals.user) {
      return fail(401, { success: false, message: "Unauthorized" });
    }

    const formData = await request.formData();
    const email = formData.get("email")?.toString();

    if (!email) {
      return fail(400, { success: false, message: "Email is required" });
    }

    try {
      // This action needs to be implemented in the UserService
      await locals.deps.users.updateEmail(locals.user.userId, email);

      return { success: true };
    } catch (err) {
      logger.error({ err }, "Error updating email");
      return fail(500, {
        success: false,
        message: err instanceof Error ? err.message : "An unknown error occurred"
      });
    }
  }
};
