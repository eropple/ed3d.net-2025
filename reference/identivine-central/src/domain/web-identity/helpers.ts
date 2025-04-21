import { type WebIdentityResponse } from "../../_api/routes/web-identity/schemas.js";
import { type DBSiteWebIdentity } from "../../_db/models.js";

export function transformWebIdentityToAPIResponse(
  identity: DBSiteWebIdentity,
): WebIdentityResponse {
  return {
    kind: "web",
    webIdentityId: identity.webIdentityId,
    url: identity.url,
    status: identity.status,
    verificationMethod: identity.verificationMethod,
    displayOnSite: identity.displayOnSite,
    statusLastCheckedAt: identity.statusLastCheckedAt.toISOString(),
    order: identity.order,
  };
}
