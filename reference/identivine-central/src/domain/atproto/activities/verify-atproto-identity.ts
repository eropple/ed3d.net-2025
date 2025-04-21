import { activity } from "../../../_worker/activity-helpers.js";

export interface VerifyATProtoIdentityInput {
  identityId: string;
}

export interface VerifyATProtoIdentityOutput {
  success: boolean;
}

export const verifyATProtoIdentityActivity = activity("verifyATProtoIdentity", {
  fn: async (
    _context,
    logger,
    deps,
    input: VerifyATProtoIdentityInput,
  ): Promise<VerifyATProtoIdentityOutput> => {
    const { atprotoIdentity: atproto } = deps;
    const result = await atproto.verifyIdentity(input.identityId);
    return { success: result.status === "verified" };
  },
});
