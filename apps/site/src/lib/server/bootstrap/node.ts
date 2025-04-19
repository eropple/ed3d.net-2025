import { loadAppConfigFromNodeEnv } from "../_config/env-loader.js";
import type { AppConfig } from "../_config/types/index.js";

import { bootstrapFromConfig, type BootstrapArgs } from "./shared.js";

export async function bootstrapNode(name: string, args: BootstrapArgs = {}) {
  const appConfig: AppConfig = loadAppConfigFromNodeEnv();

  return bootstrapFromConfig(name, appConfig, args);
}
