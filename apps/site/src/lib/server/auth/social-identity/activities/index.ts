import { getBatchedRefreshableIdentitiesActivity } from "./get-batched-identities.js";
import { refreshSingleIdentityTokenActivity } from "./refresh-single-identity.js";

export const socialIdentityActivities = {
  getBatchedRefreshableIdentitiesActivity,
  refreshSingleIdentityTokenActivity,
};

// We might also want an array for easier registration later
export const allSocialIdentityActivities = [
  getBatchedRefreshableIdentitiesActivity,
  refreshSingleIdentityTokenActivity,
];
