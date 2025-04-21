import { type MastodonIdentityResponse } from "../../_api/routes/mastodon/schemas.js";

import { type MastodonIdentityWithApp } from "./types.js";

export function transformMastodonIdentityToAPIResponse({
  app,
  identity,
}: MastodonIdentityWithApp): MastodonIdentityResponse {
  return {
    kind: "mastodon",
    mastodonIdentityId: identity.mastodonIdentityId,
    instanceUrl: app.instanceUrl,
    username: identity.username,
    status: identity.status,
    displayOnSite: identity.displayOnSite,
    statusLastCheckedAt: identity.statusLastCheckedAt.toISOString(),
    profileUrl: `${app.instanceUrl}/@${identity.username}`,
    order: identity.order,
  };
}
