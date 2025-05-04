import { redirect } from "@sveltejs/kit";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = locals;

	// If no user session exists, redirect them to the login page.
	if (!user) {
		redirect(302, "/auth/login");
	}

	// Make the user object available to the layout and all child pages (+page.svelte)
	return {
		user: user,
	};
};