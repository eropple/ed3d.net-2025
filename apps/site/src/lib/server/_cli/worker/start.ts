import { command, oneOf, positional, string } from "cmd-ts";

import { workerMain } from "../../_worker/index.js";
import type { TemporalQueueConfig } from "../../temporal/config.js";

export const workerStartCommand = command({
  name: "start",
  args: {
    workerType: positional({
      type: oneOf(["core"]),
      displayName: "worker type",
      description: "the type of worker to start",
    }),
  },
  handler: async (args) => {
    await workerMain(args.workerType as keyof TemporalQueueConfig);
  },
});
