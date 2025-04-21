import { type SiteTier } from "../../../../_db/models.js";
import { activity } from "../../../../_worker/activity-helpers.js";

export interface GetSitesByTierInput {
  tier: SiteTier;
  limit: number;
  offset: number;
}

export interface GetSitesByTierOutput {
  siteIds: string[];
}

export const getSitesByTierActivity = activity("getSitesByTier", {
  fn: async (
    _context,
    logger,
    deps,
    input: GetSitesByTierInput,
  ): Promise<GetSitesByTierOutput> => {
    const { sites } = deps;
    return sites.getSiteIdsByTier(input.tier, input.limit, input.offset);
  },
});
