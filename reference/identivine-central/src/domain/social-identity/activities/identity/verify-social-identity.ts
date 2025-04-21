import { activity } from "../../../../_worker/activity-helpers.js";

export interface VerifySocialIdentityInput {
  identityId: string;
}

export interface VerifySocialIdentityOutput {
  success: boolean;
}

export const verifySocialIdentityActivity = activity("verifySocialIdentity", {
  fn: async (
    _context,
    logger,
    deps,
    input: VerifySocialIdentityInput,
  ): Promise<VerifySocialIdentityOutput> => {
    const { socialIdentity } = deps;
    const result = await socialIdentity.verifyIdentity(input.identityId);
    return { success: result.status === "verified" };
  },
});
