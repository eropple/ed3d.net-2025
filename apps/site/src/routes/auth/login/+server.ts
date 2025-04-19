import { redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

/**
 * Route that handles initiating the OIDC login flow
 * Redirects the user to the identity provider (Keycloak)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  const authService = locals.deps.auth;

  // Get the redirect_uri from the query parameters (where to send the user after auth)
  const baseRedirectUri = url.searchParams.get("redirect_uri") || "/";
  // We want to use a fully qualified URL, so if it's a relative path, append the base URL
  const redirectUri = baseRedirectUri.startsWith("/") ? new URL(baseRedirectUri, locals.config.urls.frontendBaseUrl) : new URL(baseRedirectUri);

  // Initialize the OIDC flow
  const authUrl = await authService.initiateOIDCFlow(redirectUri);

  // Redirect the user to the identity provider
  throw redirect(302, authUrl.toString());
};