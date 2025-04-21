import { command, positional, string } from "cmd-ts";

import { loadAppConfigFromEnvNode } from "../../_config/env-loader.js";
import { bootstrapNode } from "../../lib/bootstrap/init.js";

export const completeImageUploadCommand = command({
  name: "complete-image-upload",
  args: {
    userId: positional({
      type: string,
      displayName: "userId",
      description: "The user ID who created the upload",
    }),
    siteId: positional({
      type: string,
      displayName: "siteId",
      description: "The site ID for this upload",
    }),
    imageUploadId: positional({
      type: string,
      displayName: "imageUploadId",
      description: "The upload ID to complete",
    }),
  },
  handler: async ({ userId, siteId, imageUploadId }) => {
    const { ROOT_LOGGER, ROOT_CONTAINER } = await bootstrapNode(
      "cli-image-upload",
      loadAppConfigFromEnvNode(),
      {
        skipMigrations: true,
      },
    );

    const { imageId } = await ROOT_CONTAINER.cradle.images.completeUpload(
      userId,
      siteId,
      imageUploadId,
    );

    ROOT_LOGGER.info({ imageId }, "Completed image upload");
    process.stdout.write(JSON.stringify({ imageId }) + "\n");
    process.exit(0);
  },
});
