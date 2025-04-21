import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { StringUUID } from "../../../lib/ext/typebox.js";

export const MastodonAuthorizationResponse = schemaType(
  "MastodonAuthorizationResponse",
  Type.Object({
    authUrl: Type.String(),
  }),
);
export type MastodonAuthorizationResponse = Static<
  typeof MastodonAuthorizationResponse
>;

export const MastodonCallbackQuerystring = schemaType(
  "MastodonCallbackQuerystring",
  Type.Object({
    code: Type.String(),
    state: Type.String(),
  }),
);
export type MastodonCallbackQuerystring = Static<
  typeof MastodonCallbackQuerystring
>;

export const MastodonIdentityResponse = schemaType(
  "MastodonIdentityResponse",
  Type.Object({
    kind: Type.Literal("mastodon"),
    mastodonIdentityId: StringUUID,
    instanceUrl: Type.String(),
    username: Type.String(),
    status: Type.String(),
    displayOnSite: Type.Boolean(),
    statusLastCheckedAt: Type.String(),
    profileUrl: Type.String({ format: "uri" }),
    order: Type.Number(),
  }),
);
export type MastodonIdentityResponse = Static<typeof MastodonIdentityResponse>;

export const ListMastodonIdentitiesResponse = schemaType(
  "ListMastodonIdentitiesResponse",
  Type.Object({
    identities: Type.Array(MastodonIdentityResponse),
  }),
);
export type ListMastodonIdentitiesResponse = Static<
  typeof ListMastodonIdentitiesResponse
>;

export const UpdateIdentityDisplayRequest = schemaType(
  "UpdateMastodonIdentityDisplayRequest",
  Type.Object({
    displayOnSite: Type.Boolean(),
  }),
);
export type UpdateIdentityDisplayRequest = Static<
  typeof UpdateIdentityDisplayRequest
>;
