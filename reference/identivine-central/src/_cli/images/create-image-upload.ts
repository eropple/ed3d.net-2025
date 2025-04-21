import { command, positional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { type ImageUsage } from "../../domain/images/schemas.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const createImageUploadCommand = command({
  name: "create-image-upload",
  args: {
    userId: positional({
      type: string,
      displayName: "userId",
      description: "The user ID to create an upload for",
    }),
    siteId: positional({
      type: string,
      displayName: "siteId",
      description: "The site ID to create an upload for",
    }),
    usage: positional({
      type: string,
      displayName: "usage",
      description: "The usage type for this image (avatar, header, etc)",
    }),
  },
  handler: async ({ userId, siteId, usage }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-image-upload",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const { uploadUrl, imageUploadId } =
      await ROOT_CONTAINER.cradle.images.createUploadUrl(
        userId,
        siteId,
        usage as ImageUsage,
      );

    ROOT_LOGGER.info({ uploadUrl, imageUploadId }, "Created image upload");
    process.stdout.write(JSON.stringify({ uploadUrl, imageUploadId }) + "\n");
    process.exit(0);
  },
});
