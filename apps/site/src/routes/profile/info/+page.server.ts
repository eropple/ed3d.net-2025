import { fail, isRedirect } from "@sveltejs/kit";
import { redirect as flashRedirect } from "sveltekit-flash-message/server";

import type { Actions } from "./$types";

import { RateLimitError } from "$lib/server/auth/service";


// Note: No `load` function here is needed for now, as the user data
// comes from the parent layout's load function (`/profile/+layout.server.ts`).

export const actions: Actions = {
	// Update email action
	updateEmail: async ({ request, locals }) => {
		const logger = locals.logger.child({ action: "/profile/info:updateEmail" });
		// User object is guaranteed by the layout load, but check defensively
		if (!locals.user) {
			return fail(401, { formName: "updateEmail", success: false, message: "Unauthorized" });
		}

		const formData = await request.formData();
		const email = formData.get("email")?.toString();

		if (!email) {
			return fail(400, { formName: "updateEmail", success: false, message: "Email is required" });
		}

		try {
			// We pass the user ID obtained from locals
			await locals.deps.authService.startEmailChangeVerification(locals.user.userId, email);
            // The enhance function on the client side will handle this success case.
            // Return a success marker and potentially the submitted email if needed later.
			return { success: true, formName: "updateEmail", email: email };
		} catch (error) {
			logger.error({ err: error, userId: locals.user.userId }, "Error starting email update verification");
			const message = error instanceof Error ? error.message : "An unknown error occurred";
			return fail(500, {
				formName: "updateEmail",
				success: false,
				message: message,
                email: email // Return submitted email on error for repopulation
			});
		}
	},

	// Update username action
	updateUsername: async ({ request, locals, cookies }) => {
		const logger = locals.logger.child({ action: "/profile/info:updateUsername" });
		if (!locals.user) {
			return fail(401, { formName: "updateUsername", success: false, message: "Unauthorized" });
		}

		const formData = await request.formData();
		const username = formData.get("username")?.toString();

		if (!username) {
			return fail(400, { formName: "updateUsername", success: false, message: "Username is required", username: "" });
		}

		const trimmedUsername = username.trim();

		try {
			logger.debug({ userId: locals.user.userId, requestedUsername: trimmedUsername }, "Attempting to update username via action.");
			const updatedUser = await locals.deps.users.updateUsername(locals.user.userId, trimmedUsername);
			logger.info({ userId: locals.user.userId, newUsername: updatedUser.username }, "Username updated successfully via action.");

            // Redirect back to the info page with a success message
			throw flashRedirect(
				303,
				"/profile/info", // Redirect back to the current page
				{ type: "success", message: `Username updated to ${updatedUser.username} successfully.` },
				cookies
			);

		} catch (error) {
			if (isRedirect(error)) {
				throw error; // Re-throw redirects (like the flash message one)
			}

			logger.warn({ err: error, userId: locals.user.userId, requestedUsername: trimmedUsername }, "Error updating username via action.");
			const message = error instanceof Error ? error.message : "An unknown error occurred while updating the username.";
			// Return fail with the submitted username so the form can be repopulated
			return fail(400, {
				formName: "updateUsername",
				success: false,
				message: message,
				username: trimmedUsername
			});
		}
	},

	// Resend verification email action
	resendVerificationEmail: async ({ locals }) => {
		const logger = locals.logger.child({ action: "/profile/info:resendVerificationEmail" });
		if (!locals.user) {
			return fail(401, { formName: "resendVerification", success: false, message: "Unauthorized" });
		}

		try {
			await locals.deps.authService.requestVerifyLink(locals.user.userId);
			logger.info({ userId: locals.user.userId }, "Verification email resent successfully.");
			return {
				success: true,
				formName: "resendVerification",
				message: "Verification email resent. Please check your inbox."
			};
		} catch (error) {
			if (error instanceof RateLimitError) {
				logger.warn({ err: error, userId: locals.user.userId }, "Rate limit hit for resending verification email.");
				return fail(429, { // HTTP 429 Too Many Requests
					formName: "resendVerification",
					success: false,
					message: error.message // Use the message from RateLimitError
				});
			}
			logger.error({ err: error, userId: locals.user.userId }, "Error resending verification email.");
			const message = error instanceof Error ? error.message : "An unknown error occurred.";
			return fail(500, {
				formName: "resendVerification",
				success: false,
				message: message
			});
		}
	}
};