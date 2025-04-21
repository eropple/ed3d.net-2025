import { type OAuth2IdentityResponse } from "../../_api/routes/social-identities/schemas.js";
import { type DBSiteSocialOAuth2Identity } from "../../_db/models.js";

import { OAUTH2_PROVIDER_METADATA } from "./providers.js";

export function transformSocialIdentityToAPIResponse(
  identity: DBSiteSocialOAuth2Identity,
): OAuth2IdentityResponse {
  return {
    kind: "social",
    oauth2IdentityId: identity.socialOAuth2IdentityId,
    provider: identity.provider,
    providerUsername: identity.providerUsername,
    status: identity.status,
    displayOnSite: identity.displayOnSite,
    statusLastCheckedAt: identity.statusLastCheckedAt.toISOString(),
    profileUrl:
      OAUTH2_PROVIDER_METADATA[identity.provider].profileUrl(identity),
    order: identity.order,
  };
}
