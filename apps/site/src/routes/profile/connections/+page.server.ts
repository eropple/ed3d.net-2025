import { fail, isRedirect } from "@sveltejs/kit";
import { redirect as flashRedirect } from "sveltekit-flash-message/server";

import type { Actions, PageServerLoad } from "./$types";

import type { StringUUID } from "$lib/ext/typebox";
import type { SocialOAuth2ProviderKind } from "$lib/server/db/schema";

// Temporary helper map - ideally expose from AuthService or a shared constant
// Consider moving this to a shared location if used elsewhere.
const providerDisplayNames: Record<SocialOAuth2ProviderKind, string> = {
	github: "GitHub",
	google: "Google",
	discord: "Discord"
};

// Load user connections and available providers for the page
export const load: PageServerLoad = async ({ locals }) => {
	const { user, deps, logger } = locals;

	// User should always exist due to layout check, but verify defensively.
	if (!user) {
		logger.error("User object unexpectedly missing in /profile/connections/+page.server.ts load");
		// In a real scenario, the layout redirect should handle this,
		// but returning empty data prevents runtime errors on the page.
		return {
			connections: { social: [] },
			missingConnections: { social: [] },
			providerNameMap: {}
		};
	}

	const { authService } = deps;

	// Fetch current connections and providers the user can still connect
	const connections = await authService.getUserConnections(user);
	const missingConnections = await authService.getMissingConnections(user);

	// Create a map of provider IDs to display names for missing connections
	const providerNameMap: Partial<Record<SocialOAuth2ProviderKind, string>> = {};
	for (const providerId of missingConnections.social) {
		providerNameMap[providerId] = providerDisplayNames[providerId] || providerId;
	}

	// Prepare data for the page
	return {
		// No need to pass the user object here, it's available via layoutData in +page.svelte
		connections: {
			social: connections.social
		},
		missingConnections: {
			social: missingConnections.social
		},
		providerNameMap
	};
};

export const actions: Actions = {
	// Remove social connection action
	removeConnection: async ({ request, locals, cookies }) => {
		const logger = locals.logger.child({ action: "/profile/connections:removeConnection" });
		if (!locals.user) {
			return fail(401, { formName: "removeConnection", success: false, message: "Unauthorized" });
		}

		const formData = await request.formData();
		const identityUuid = formData.get("identityUuid")?.toString() as StringUUID | undefined;

		if (!identityUuid) {
			logger.warn("Missing identityUuid in removeConnection request");
			return fail(400, {
				formName: "removeConnection",
				success: false,
				message: "Missing connection identifier"
			});
		}

		try {
			logger.debug(
				{ userId: locals.user.userId, identityUuid },
				"Attempting to remove social identity"
			);
			// Fetch connections again here to get the name for the flash message
			// Alternatively, pass providerName in the form if needed.
			const connections = await locals.deps.authService.getUserConnections(locals.user.userId);
			const connectionToRemove = connections.social.find((c) => c.identityUuid === identityUuid);
			const providerName = connectionToRemove?.providerName || "Account";

			await locals.deps.authService.removeSocialIdentity(locals.user.userId, identityUuid);
			logger.info(
				{ userId: locals.user.userId, identityUuid },
				"Successfully removed social identity"
			);

			// Redirect back to the connections page with a success flash message
			throw flashRedirect(
				303,
				"/profile/connections", // Redirect back to this page
				{ type: "success", message: `${providerName} disconnected successfully.` },
				cookies
			);
		} catch (error) {
			if (isRedirect(error)) {
				throw error; // Re-throw redirects (like the flash message one)
			}

			logger.error(
				{ err: error, userId: locals.user.userId, identityUuid },
				"Error removing social identity"
			);
			return fail(500, {
				formName: "removeConnection",
				success: false,
				message:
					error instanceof Error
						? error.message
						: "An unknown error occurred while removing the connection"
			});
		}
	}
};