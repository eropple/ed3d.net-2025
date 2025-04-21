import { command, positional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { SITES } from "../../_db/schema/index.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const atprotoAuthUrlCommand = command({
  name: "atproto-auth-url",
  args: {
    siteId: positional({
      type: string,
      displayName: "siteId",
      description: "The site ID to generate an auth URL for",
    }),
    handle: positional({
      type: string,
      displayName: "handle",
      description: "The ATProto handle to authenticate with",
    }),
  },
  handler: async ({ siteId, handle }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-atproto",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const site = await ROOT_CONTAINER.cradle.sites.getSiteById(siteId);

    if (!site) {
      throw new Error(`Site ${siteId} not found`);
    }

    ROOT_LOGGER.info({ site, handle }, "Generating ATProto auth URL");
    const authUrl =
      await ROOT_CONTAINER.cradle.atprotoIdentity.getAuthorizationUrl(
        site,
        handle,
      );
    ROOT_LOGGER.info({ authUrl }, "Generated ATProto auth URL");
    process.stdout.write(authUrl + "\n");
    process.exit(0);
  },
});
