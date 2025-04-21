import { command, option, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const verifyMastodonCommand = command({
  name: "verify-mastodon",
  args: {
    siteId: option({
      type: string,
      short: "s",
      long: "site-id",
      description: "Site ID to verify.",
    }),
    mastodonIdentityId: option({
      type: string,
      short: "i",
      long: "mastodon-identity-id",
      description:
        "Specific Mastodon identity ID to verify. If omitted, verifies all Mastodon identities.",
    }),
  },
  handler: async ({ siteId, mastodonIdentityId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-verify-mastodon",
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

    const mastodonService = ROOT_CONTAINER.cradle.mastodonIdentity;
    await mastodonService.verifyIdentity(mastodonIdentityId);
    ROOT_LOGGER.info("Ran Mastodon identity verification");

    process.exit(0);
  },
});
