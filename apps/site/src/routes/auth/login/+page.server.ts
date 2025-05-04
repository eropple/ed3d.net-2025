import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";
// We likely don't need actions here as the forms POST elsewhere

export const load: PageServerLoad = async ({ locals, url }) => {
    // If the user is already logged in, redirect them away from the login page.
    // Redirect to the 'redirect' query param if present, otherwise to '/profile'.
    if (locals.user) {
        const redirectTo = url.searchParams.get("redirect") || "/profile";
        // Basic validation to prevent open redirect vulnerabilities
        if (redirectTo.startsWith("/")) {
          throw redirect(302, redirectTo);
        }
        // Fallback redirect if the param is invalid
        throw redirect(302, "/profile");
    }

    // If not logged in, just render the page.
    // We might pass props like available auth methods if they weren't static,
    // but AUTH_METHODS seems static for now.
    return {};
};