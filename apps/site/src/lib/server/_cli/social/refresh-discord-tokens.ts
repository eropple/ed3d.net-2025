import { command } from "cmd-ts";

import * as coreWorkflows from "../../_worker/workflows/core/index.js";
import { bootstrapNode } from "../../bootstrap/node.js";

export const refreshDiscordTokensCommand = command({
  name: "refresh-discord-tokens",
  args: {},
  handler: async () => {
    const { ROOT_LOGGER, SINGLETON_CONTAINER } = await bootstrapNode(
      "cli-refresh-discord-tokens",
      { skipMigrations: true },
    );

    const logger = ROOT_LOGGER;
    const temporal = SINGLETON_CONTAINER.cradle.temporal;

    try {
      const handle = await temporal.start("core", coreWorkflows.refreshDiscordTokensWorkflow, []);
      logger.info({ workflowId: handle.workflowId }, "Successfully started workflow");

    } catch (err) {
      logger.error({ err }, "Failed to trigger Discord token refresh workflow");
      process.exit(1);
    } finally {
      await SINGLETON_CONTAINER.dispose();
    }
    process.exit(0);
  },
});
