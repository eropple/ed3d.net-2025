import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { StringUUID } from "../../../lib/ext/typebox.js";

export const ATProtoAuthorizationResponse = schemaType(
  "ATProtoAuthorizationResponse",
  Type.Object({
    authUrl: Type.String(),
  }),
);
export type ATProtoAuthorizationResponse = Static<
  typeof ATProtoAuthorizationResponse
>;

export const ATProtoPublicJWKS = schemaType(
  "ATProtoPublicJWKS",
  Type.Object({
    keys: Type.Array(
      Type.Object({
        kty: Type.Literal("EC"),
        crv: Type.Literal("P-256"),
        kid: Type.String(),
        x: Type.String(),
        y: Type.String(),
      }),
    ),
  }),
);
export type ATProtoPublicJWKS = Static<typeof ATProtoPublicJWKS>;

export const ATProtoIdentityResponse = schemaType(
  "ATProtoIdentityResponse",
  Type.Object({
    kind: Type.Literal("atproto"),
    atprotoIdentityId: StringUUID,
    did: Type.String(),
    handle: Type.String(),
    status: Type.String(),
    displayOnSite: Type.Boolean(),
    statusLastCheckedAt: Type.String(),
    order: Type.Number(),
  }),
);
export type ATProtoIdentityResponse = Static<typeof ATProtoIdentityResponse>;

export const ListATProtoIdentitiesResponse = schemaType(
  "ListATProtoIdentitiesResponse",
  Type.Object({
    identities: Type.Array(ATProtoIdentityResponse),
  }),
);
export type ListATProtoIdentitiesResponse = Static<
  typeof ListATProtoIdentitiesResponse
>;

export const UpdateIdentityDisplayRequest = schemaType(
  "UpdateATProtoIdentityDisplayRequest",
  Type.Object({
    displayOnSite: Type.Boolean(),
  }),
);
export type UpdateIdentityDisplayRequest = Static<
  typeof UpdateIdentityDisplayRequest
>;
