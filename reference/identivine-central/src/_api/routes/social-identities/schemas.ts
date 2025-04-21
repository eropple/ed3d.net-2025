import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { SocialOAuth2ProviderKind } from "../../../_db/models.js";
import { StringUUID } from "../../../lib/ext/typebox.js";

export const SiteIdParams = schemaType(
  "SiteIdParams",
  Type.Object({
    siteId: StringUUID,
  }),
);
export type SiteIdParams = Static<typeof SiteIdParams>;

export const OAuth2ProviderPathParams = schemaType(
  "OAuth2ProviderPathParams",
  Type.Intersect([
    Type.Object({
      provider: SocialOAuth2ProviderKind,
    }),
    SiteIdParams,
  ]),
);
export type OAuth2ProviderPathParams = Static<typeof OAuth2ProviderPathParams>;

export const OAuth2CallbackQuerystring = schemaType(
  "OAuth2CallbackQuerystring",
  Type.Object({
    code: Type.String(),
    state: Type.String(),
  }),
);
export type OAuth2CallbackQuerystring = Static<
  typeof OAuth2CallbackQuerystring
>;

export const OAuth2AuthorizationResponse = schemaType(
  "OAuth2AuthorizationResponse",
  Type.Object({
    authUrl: Type.String(),
  }),
);
export type OAuth2AuthorizationResponse = Static<
  typeof OAuth2AuthorizationResponse
>;

export const OAuth2IdentityResponse = schemaType(
  "OAuth2IdentityResponse",
  Type.Object({
    kind: Type.Literal("social"),
    oauth2IdentityId: StringUUID,
    provider: Type.String(),
    providerUsername: Type.String(),
    status: Type.String(),
    displayOnSite: Type.Boolean(),
    statusLastCheckedAt: Type.String(),
    profileUrl: Type.String({ format: "uri" }),
    order: Type.Number(),
  }),
);
export type OAuth2IdentityResponse = Static<typeof OAuth2IdentityResponse>;

export const ListOAuth2IdentitiesResponse = schemaType(
  "ListOAuth2IdentitiesResponse",
  Type.Object({
    identities: Type.Array(OAuth2IdentityResponse),
  }),
);
export type ListOAuth2IdentitiesResponse = Static<
  typeof ListOAuth2IdentitiesResponse
>;
