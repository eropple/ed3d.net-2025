import { command, flag, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const verifyAtprotoCommand = command({
  name: "verify-atproto",
  args: {
    atprotoIdentityId: option({
      type: string,
      short: "i",
      long: "atproto-identity-id",
      description: "Specific ATProto identity ID to verify.",
    }),
    skipLabeling: flag({
      long: "skip-labeling",
      description:
        "Skip labeling the ATProto identity. This is useful if you want to verify an ATProto identity without labeling it.",
    }),
  },
  handler: async ({ atprotoIdentityId, skipLabeling }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-verify-atproto",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const atprotoService = ROOT_CONTAINER.cradle.atprotoIdentity;
    const result = await atprotoService.verifyIdentity(
      atprotoIdentityId,
      skipLabeling,
    );
    ROOT_LOGGER.info(
      { atprotoIdentityId, status: result.status },
      "Ran ATProto identity verification",
    );

    process.exit(0);
  },
});
