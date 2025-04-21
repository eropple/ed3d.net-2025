import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const verifyWebCommand = command({
  name: "verify-web",
  args: {
    siteId: option({
      type: string,
      short: "s",
      long: "site-id",
      description: "Site ID to verify.",
    }),
    webIdentityId: option({
      type: string,
      short: "i",
      long: "web-identity-id",
      description:
        "Specific web identity ID to verify. If omitted, verifies all web identities.",
    }),
  },
  handler: async ({ siteId, webIdentityId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-verify-web",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const site = await ROOT_CONTAINER.cradle.sites.getSiteById(siteId);
    if (!site) {
      ROOT_LOGGER.error({ siteId }, "Site not found");
      process.exit(1);
    }

    const webIdentityService = ROOT_CONTAINER.cradle.webIdentity;

    const result = await webIdentityService.requestVerification(
      siteId,
      webIdentityId,
      true,
    );
    ROOT_LOGGER.info(
      { webIdentityId, status: result.status },
      "Ran web identity verification",
    );

    process.exit(0);
  },
});
