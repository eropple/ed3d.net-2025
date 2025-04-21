import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const verifySocialCommand = command({
  name: "verify-social",
  args: {
    socialIdentityId: option({
      type: string,
      short: "i",
      long: "social-identity-id",
      description:
        "Specific social identity ID to verify. If omitted, verifies all social identities.",
    }),
  },
  handler: async ({ socialIdentityId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-verify-social",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const socialIdentityService = ROOT_CONTAINER.cradle.socialIdentity;
    await socialIdentityService.verifyIdentity(socialIdentityId);
    ROOT_LOGGER.info("Ran social identity verification");

    process.exit(0);
  },
});
