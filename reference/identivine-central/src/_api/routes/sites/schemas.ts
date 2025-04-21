import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { SitePublicInfo } from "../../../domain/sites/schemas/index.js";
import {
  StringEnum,
  StringUUID,
  UnionOneOf,
} from "../../../lib/ext/typebox.js";
import { ATProtoIdentityResponse } from "../atproto/schemas.js";
import { MastodonIdentityResponse } from "../mastodon/schemas.js";
import { OAuth2IdentityResponse } from "../social-identities/schemas.js";
import { WebIdentityResponse } from "../web-identity/schemas.js";

export const SiteBasicInfoUpdate = schemaType(
  "SiteBasicInfoUpdate",
  Type.Partial(Type.Pick(SitePublicInfo, ["title", "blurb"])),
);
export type SiteBasicInfoUpdate = Static<typeof SiteBasicInfoUpdate>;

export const IdentityKind = schemaType(
  "IdentityKind",
  StringEnum(["atproto", "mastodon", "social", "web"]),
);
export type ReorderIdentityKind = Static<typeof IdentityKind>;

export const ReorderIdentityRequest = schemaType(
  "ReorderIdentityRequest",
  Type.Object({
    kind: Type.String(),
    identityId: Type.String(),
    afterIdentityId: Type.Optional(Type.String()),
    afterIdentityKind: Type.Optional(Type.String()),
  }),
);
export type ReorderIdentityRequest = Static<typeof ReorderIdentityRequest>;

export const AnyIdentityResponse = schemaType(
  "AnyIdentityResponse",
  UnionOneOf([
    ATProtoIdentityResponse,
    MastodonIdentityResponse,
    OAuth2IdentityResponse,
    WebIdentityResponse,
  ]),
);
export type AnyIdentityResponse = Static<typeof AnyIdentityResponse>;

export const ListAllIdentitiesResponse = schemaType(
  "ListAllIdentitiesResponse",
  Type.Object({
    atproto: Type.Array(ATProtoIdentityResponse),
    mastodon: Type.Array(MastodonIdentityResponse),
    social: Type.Array(OAuth2IdentityResponse),
    web: Type.Array(WebIdentityResponse),
  }),
);
export type ListAllIdentitiesResponse = Static<
  typeof ListAllIdentitiesResponse
>;

export const AvatarUploadCompleteRequest = schemaType(
  "AvatarUploadCompleteRequest",
  Type.Object({
    imageUploadId: StringUUID,
  }),
);
export type AvatarUploadCompleteRequest = Static<
  typeof AvatarUploadCompleteRequest
>;
