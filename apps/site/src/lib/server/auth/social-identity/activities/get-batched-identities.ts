import { and, eq, isNotNull, lt } from "drizzle-orm";
import ms from "ms";

import type { StringUUID } from "../../../../ext/typebox/index.js";
import type { AppActivityCradle } from "../../../_deps/scopes/activity.js";
import { activity } from "../../../_worker/activity-helpers.js";
import { USER_SOCIAL_OAUTH2_IDENTITIES, type SocialOAuth2ProviderKind } from "../../../db/schema/index.js";

type GetBatchedIdentitiesArgs = {
  provider: SocialOAuth2ProviderKind;
  batchSize: number;
};

const REFRESH_THRESHOLD_MS = ms("3d"); // Configurable: Refresh if last refresh was > 3 days ago

export const getBatchedRefreshableIdentitiesActivity = activity(
  "getBatchedRefreshableIdentities",
  {
    fn: async (
      _context,
      logger,
      deps: AppActivityCradle,
      { provider, batchSize }: GetBatchedIdentitiesArgs,
    ): Promise<Array<Array<StringUUID>>> => {
      const { dbRO } = deps;
      const thresholdDate = new Date(Date.now() - REFRESH_THRESHOLD_MS);

      logger.info(
        { provider, batchSize, thresholdDate: thresholdDate.toISOString() },
        "Fetching refreshable identities",
      );

      const identities = await dbRO
        .select({
          uuid: USER_SOCIAL_OAUTH2_IDENTITIES.userSocialOAuth2IdentityUuid,
        })
        .from(USER_SOCIAL_OAUTH2_IDENTITIES)
        .where(
          and(
            eq(USER_SOCIAL_OAUTH2_IDENTITIES.provider, provider),
            isNotNull(USER_SOCIAL_OAUTH2_IDENTITIES.refreshToken),
            // Check if lastRefreshedAt is older than threshold OR null
            lt(USER_SOCIAL_OAUTH2_IDENTITIES.lastRefreshedAt, thresholdDate),
          ),
        );

      const identityUuids = identities.map(i => i.uuid);
      logger.info({ provider, count: identityUuids.length }, "Found identities needing refresh");

      // Partition into batches
      const batches: Array<Array<StringUUID>> = [];
      for (let i = 0; i < identityUuids.length; i += batchSize) {
        batches.push(identityUuids.slice(i, i + batchSize));
      }

      logger.info({ provider, batchCount: batches.length, batchSize }, "Partitioned identities into batches");

      return batches;
    },
  },
);
