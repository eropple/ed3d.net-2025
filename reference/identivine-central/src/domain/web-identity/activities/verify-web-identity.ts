import { activity } from "../../../_worker/activity-helpers.js";

export interface VerifyWebIdentityInput {
  siteId: string;
  identityId: string;
}

export interface VerifyWebIdentityOutput {
  success: boolean;
}

export const verifyWebIdentityActivity = activity("verifyWebIdentity", {
  fn: async (
    _context,
    logger,
    deps,
    input: VerifyWebIdentityInput,
  ): Promise<VerifyWebIdentityOutput> => {
    const { webIdentity } = deps;
    const identity = await webIdentity.requestVerification(
      input.siteId,
      input.identityId,
      true, // override wait time for scheduled checks
    );
    return { success: identity.status === "verified" };
  },
});
