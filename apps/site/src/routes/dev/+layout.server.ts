import { error } from "@sveltejs/kit";

import type { LayoutServerLoad } from "./$types";

import type { AppConfig } from "$lib/server/_config/types";

export const load: LayoutServerLoad = async ({ locals }) => {
  // locals.config should be injected by hooks.server.ts
  // and should conform to AppConfig
  const config = locals.config as AppConfig; // Cast if not automatically typed

  if (config?.env !== "development") {
    throw error(404, "Not Found");
  }

  // No specific data needs to be returned to the layout component itself
  // for this check, but you could return parts of the config if needed by child pages/layouts.
  return {};
};