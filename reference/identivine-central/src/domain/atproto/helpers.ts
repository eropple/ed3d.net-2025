import { type ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { type Logger } from "pino";

import { type ATProtoIdentityResponse } from "../../_api/routes/atproto/schemas.js";
import { type DBSite, type DBSiteATProtoIdentity } from "../../_db/models.js";
import { SITE_DOMAINS } from "../../_db/schema/index.js";
import {
  inArray,
  type DrizzleRO,
} from "../../lib/datastores/postgres/types.server.js";

export function transformATProtoIdentityToAPIResponse(
  identity: DBSiteATProtoIdentity,
): ATProtoIdentityResponse {
  return {
    kind: "atproto",
    atprotoIdentityId: identity.atprotoIdentityId,
    did: identity.did,
    handle: identity.handle,
    status: identity.status,
    displayOnSite: identity.displayOnSite,
    statusLastCheckedAt: identity.statusLastCheckedAt.toISOString(),
    order: identity.order,
  };
}

export type FindLinksInATProtoProfileResult = {
  /**
   * This profile is linking to their own Identivine site on their own account.
   */
  linked: boolean;
  /**
   * This profile is linking to an Identivine site that does not point to this
   * ATProto identity.
   */
  crossLinked: boolean;
};
export type FindLinksInATProtoProfileInput = {
  did: string;
  handle: string;
  description: string;
};
