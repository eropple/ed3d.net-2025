import { command } from "cmd-ts";

import { bootstrapNode } from "../../bootstrap/node.js";

export const dbMigrateCommand = command({
  name: "migrate",
  args: {},
  handler: async (args) => {
    const { SINGLETON_CONTAINER, ROOT_LOGGER } = await bootstrapNode(
      "db-migrate",
      {
        // always will do the migrations here
        skipMigrations: false,
      }
    );
    process.exit(0);
  },
});
