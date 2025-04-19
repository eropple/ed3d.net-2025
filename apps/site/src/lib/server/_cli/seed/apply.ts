import { command, option, string } from "cmd-ts";

import { bootstrapNode } from "../../bootstrap/node.js";
import { seed } from "../../seeds/index.js";

export const seedApplyCommand = command({
  name: "apply",
  args: {
    environment: option({
      type: string,
      long: "environment",
      short: "e",
      defaultValue: () => process.env.NODE_ENV ?? "development",
      description:
        "sets the environment that should run this seed. defaults to development.",
    }),
  },
  handler: async ({ environment }) => {
    const { ROOT_LOGGER, SINGLETON_CONTAINER } = await bootstrapNode(
      "cli-seeder",
      {
        skipMigrations: true,
      },
    );

    ROOT_LOGGER.info({ environment }, "Running seed.");
    await seed(environment, SINGLETON_CONTAINER.cradle);

    await SINGLETON_CONTAINER.dispose();
    process.exit(0);
  },
});
