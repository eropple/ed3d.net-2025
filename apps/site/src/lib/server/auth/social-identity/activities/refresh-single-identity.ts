import type { StringUUID } from "../../../../ext/typebox/index.js";
import type { AppActivityCradle } from "../../../_deps/scopes/activity.js";
import { activity } from "../../../_worker/activity-helpers.js";

type RefreshSingleIdentityArgs = {
  identityUuid: StringUUID;
};

export const refreshSingleIdentityTokenActivity = activity(
  "refreshSingleIdentityToken",
  {
    fn: async (
      _context,
      logger,
      deps: AppActivityCradle,
      { identityUuid }: RefreshSingleIdentityArgs,
    ): Promise<void> => {
      const { socialIdentityService } = deps; // Assuming SocialIdentityService is in cradle

      logger.info({ identityUuid }, "Attempting to refresh token for identity");

      try {
        await socialIdentityService.refreshAccessToken(identityUuid);
        logger.info({ identityUuid }, "Successfully refreshed token");
      } catch (err) {
        // Log the error here, but rethrow it so Temporal knows it failed
        // The workflow will handle the final logging after retries.
        logger.error({ identityUuid, err }, "Failed to refresh token in activity attempt");
        throw err;
      }
    },
  },
);
