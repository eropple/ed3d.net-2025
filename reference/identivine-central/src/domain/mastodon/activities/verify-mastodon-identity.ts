import { activity } from "../../../_worker/activity-helpers.js";

export interface VerifyMastodonIdentityInput {
  identityId: string;
}

export interface VerifyMastodonIdentityOutput {
  success: boolean;
}

export const verifyMastodonIdentityActivity = activity(
  "verifyMastodonIdentity",
  {
    fn: async (
      _context,
      logger,
      deps,
      input: VerifyMastodonIdentityInput,
    ): Promise<VerifyMastodonIdentityOutput> => {
      const { mastodonIdentity: mastodon } = deps;
      const result = await mastodon.verifyIdentity(input.identityId);
      return { success: result.identity.status === "verified" };
    },
  },
);
