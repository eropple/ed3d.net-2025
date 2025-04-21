import { type BootstrapArgs } from "../../lib/bootstrap/shared.js";

import { type LabelerAppConfig } from "./config/types.js";

export async function bootstrapLabeler<TLabelerConfig extends LabelerAppConfig>(
  loggerName: string,
  config: TLabelerConfig,
  args: BootstrapArgs,
) {}
