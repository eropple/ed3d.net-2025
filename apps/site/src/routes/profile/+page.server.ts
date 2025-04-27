import { fail, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

// Load user connections for the profile page
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  // Get connections but only use social ones
  const connections = await locals.deps.authService.getUserConnections(locals.user);
  const missingConnections = await locals.deps.authService.getMissingConnections(locals.user);

  return {
    user: locals.user,
    connections: {
      social: connections.social
      // Exclude atproto connections
    },
    missingConnections: {
      social: missingConnections.social
      // Exclude atproto from missing connections
    }
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
      await locals.deps.userService.updateEmail(locals.user.userId, email);
      return { success: true };
    } catch (error) {
      logger.error({ err: error }, "Error updating email");
      return fail(500, {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      });
    }
  }
};
