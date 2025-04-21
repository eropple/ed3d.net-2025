import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import {
  SocialOAuth2ProviderKind,
  SiteTier,
  IdentityStatus,
} from "../../../_db/models.js";
import {
  StringEnum,
  StringUUID,
  UnionOneOf,
} from "../../../lib/ext/typebox.js";
import { ContentBlockRenderSettings } from "../../content-blocks/schemas/content-block-rendering/index.js";
import { ImageLinkSet } from "../../images/schemas.js";
import { SiteAbilitiesForTier } from "../tiers.js";

import { SiteSettings } from "./site-settings.js";

export const SiteContentBlock = schemaType(
  "SiteContentBlock",
  Type.Object({
    siteContentBlockId: Type.String(),
    kind: Type.String(),
    version: Type.Integer(),
    settings: ContentBlockRenderSettings,
  }),
);
export type SiteContentBlock = Static<typeof SiteContentBlock>;

export const SiteContentContainer = schemaType(
  "SiteContentContainer",
  Type.Object({
    siteContentContainerId: Type.String(),
    title: Type.Union([Type.String(), Type.Null()]),
    blocks: Type.Array(SiteContentBlock),
  }),
);
export type SiteContentContainer = Static<typeof SiteContentContainer>;

export const SiteIdentityDirectionality = StringEnum(["one-way", "two-way"]);
export type SiteIdentityDirectionality = Static<
  typeof SiteIdentityDirectionality
>;

export const SiteSocialOAuth2Identity = schemaType(
  "SiteSocialOAuth2Identity",
  Type.Object({
    kind: Type.Literal("social-oauth2"),
    order: Type.Number(),
    status: IdentityStatus,
    provider: SocialOAuth2ProviderKind,
    directionality: Type.Literal("one-way"),
    displayProvider: Type.String(),
    displayUsername: Type.String(),
    url: Type.String(),
  }),
);
export type SiteSocialOAuth2Identity = Static<typeof SiteSocialOAuth2Identity>;

export const SiteMastodonIdentity = schemaType(
  "SiteMastodonIdentity",
  Type.Object({
    kind: Type.Literal("mastodon"),
    order: Type.Number(),
    directionality: Type.Literal("one-way"),
    status: IdentityStatus,
    displayProvider: Type.Literal("Mastodon"),
    displayUsername: Type.String(),
    url: Type.String(),
  }),
);
export type SiteMastodonIdentity = Static<typeof SiteMastodonIdentity>;

export const SiteATProtoIdentity = schemaType(
  "SiteATProtoIdentity",
  Type.Object({
    kind: Type.Literal("atproto"),
    order: Type.Number(),
    status: IdentityStatus,
    directionality: Type.Literal("one-way"),
    did: Type.String(),
    displayProvider: Type.Literal("Bluesky"),
    displayUsername: Type.String(),
    handle: Type.String(),
    url: Type.String(),
  }),
);
export type SiteATProtoIdentity = Static<typeof SiteATProtoIdentity>;

export const SiteWebIdentityVerificationMethod = schemaType(
  "SiteWebIdentityVerificationMethod",
  StringEnum(["meta-tag", "rel-me", "well-known", "dns-txt"]),
);
export type SiteWebIdentityVerificationMethod = Static<
  typeof SiteWebIdentityVerificationMethod
>;

export const SiteWebIdentity = schemaType(
  "SiteWebIdentity",
  Type.Object({
    kind: Type.Literal("web"),
    order: Type.Number(),
    status: IdentityStatus,
    url: Type.String(),
    displayProvider: Type.Literal("Website"),
    displayUsername: Type.String(),
    directionality: Type.Literal("two-way"),
    verificationMethod: UnionOneOf([
      SiteWebIdentityVerificationMethod,
      Type.Null(),
    ]),
  }),
);
export type SiteWebIdentity = Static<typeof SiteWebIdentity>;

export const SitePublicIdentity = schemaType(
  "SitePublicIdentity",
  UnionOneOf([
    SiteSocialOAuth2Identity,
    SiteMastodonIdentity,
    SiteATProtoIdentity,
    SiteWebIdentity,
  ]),
);
export type SitePublicIdentity = Static<typeof SitePublicIdentity>;

export const SitePublicInfo = schemaType(
  "SitePublicInfo",
  Type.Object({
    siteId: StringUUID,
    fqdn: Type.String(),

    title: Type.String(),
    blurb: Type.Record(Type.String(), Type.Any()),

    settings: SiteSettings,

    bskyDid: Type.Union([Type.String(), Type.Null()]),

    customCss: Type.String(),

    publishedAt: Type.Union([Type.String(), Type.Null()]),

    avatarImageLinkSet: Type.Union([ImageLinkSet, Type.Null()]),
    headerImageLinkSet: Type.Union([ImageLinkSet, Type.Null()]),

    identities: Type.Array(SitePublicIdentity),

    contentContainers: Type.Array(SiteContentContainer),

    hidePoweredBy: Type.Boolean(),
  }),
);
export type SitePublicInfo = Static<typeof SitePublicInfo>;

export const SitePrivateInfo = schemaType(
  "SitePrivateInfo",
  Type.Intersect([
    SitePublicInfo,
    Type.Object({
      ownerUserId: StringUUID,
      abilities: SiteAbilitiesForTier,
      createdAt: Type.String(),
    }),
  ]),
);
export type SitePrivateInfo = Static<typeof SitePrivateInfo>;
