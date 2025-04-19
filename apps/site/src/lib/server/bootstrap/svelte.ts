import { loadAppConfigFromSvelteEnv } from "../_config/svelte-loader.js";
import type { AppConfig } from "../_config/types/index.js";

import { bootstrapFromConfig, type BootstrapArgs } from "./shared.js";

export async function bootstrapSvelte(name: string, args: BootstrapArgs = {}) {
  const appConfig: AppConfig = loadAppConfigFromSvelteEnv();

  return bootstrapFromConfig(name, appConfig, args);
}
