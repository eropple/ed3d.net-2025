import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";
import type { InferSelectModel } from "drizzle-orm";

import { StringEnum } from "../lib/ext/typebox.js";

import type { SEEDS } from "./schema/app-meta.js";
import {
  type SITE_DOMAINS,
  type USER_LOCAL_CREDENTIALS,
  type USERS,
  type SITES,
  type SITE_DOMAIN_CONTROL_SOURCE,
  type SITE_CONTENT_CONTAINERS,
  type SITE_CONTENT_BLOCKS,
  type USER_EMAIL_VERIFICATION_TOKENS,
  type SITE_SOCIAL_OAUTH2_IDENTITIES,
  IDENTITY_STATUS,
  SITE_TIER,
  SOCIAL_OAUTH2_PROVIDER_KIND,
  type MASTODON_APPS,
  type SITE_MASTODON_IDENTITIES,
  type SITE_ATPROTO_IDENTITIES,
  type SITE_WEB_IDENTITIES,
  type IMAGES,
  type IMAGE_UPLOADS,
} from "./schema/index.js";
import { type JETSTREAM_CURSOR_SINGLE } from "./schema/jetstreamer.js";
import { type LABELS } from "./schema/labeler.js";

export type DBSeed = InferSelectModel<typeof SEEDS>;

export const SiteTier = schemaType(
  "SiteTier",
  StringEnum(SITE_TIER.enumValues),
);
export type SiteTier = Static<typeof SiteTier>;

export const IdentityStatus = schemaType(
  "IdentityStatus",
  StringEnum(IDENTITY_STATUS.enumValues),
);
export type IdentityStatus = Static<typeof IdentityStatus>;

export type DBSite = InferSelectModel<typeof SITES>;

export type DBSiteDomain = InferSelectModel<typeof SITE_DOMAINS>;

export type DBUser = InferSelectModel<typeof USERS>;

export type DBUserEmailVerificationToken = InferSelectModel<
  typeof USER_EMAIL_VERIFICATION_TOKENS
>;

export type DBUserLocalCredential = InferSelectModel<
  typeof USER_LOCAL_CREDENTIALS
>;

export type DBSiteDomainControlSource =
  (typeof SITE_DOMAIN_CONTROL_SOURCE.enumValues)[number];

export type DBSiteContentContainer = InferSelectModel<
  typeof SITE_CONTENT_CONTAINERS
>;

export type DBSiteContentBlock = InferSelectModel<typeof SITE_CONTENT_BLOCKS>;

export type DBSiteSocialOAuth2Identity = InferSelectModel<
  typeof SITE_SOCIAL_OAUTH2_IDENTITIES
>;

export const SocialOAuth2ProviderKind = schemaType(
  "SocialOAuth2ProviderKind",
  StringEnum(SOCIAL_OAUTH2_PROVIDER_KIND.enumValues),
);
export type SocialOAuth2ProviderKind = Static<typeof SocialOAuth2ProviderKind>;

export type DBMastodonApp = InferSelectModel<typeof MASTODON_APPS>;
export type DBSiteMastodonIdentity = InferSelectModel<
  typeof SITE_MASTODON_IDENTITIES
>;

export type DBSiteATProtoIdentity = InferSelectModel<
  typeof SITE_ATPROTO_IDENTITIES
>;

export type DBSiteWebIdentity = InferSelectModel<typeof SITE_WEB_IDENTITIES>;

export type DBImage = InferSelectModel<typeof IMAGES>;
export type DBImageUpload = InferSelectModel<typeof IMAGE_UPLOADS>;

export type DBLabel = InferSelectModel<typeof LABELS>;

export type DBJetstreamCursorSingle = InferSelectModel<
  typeof JETSTREAM_CURSOR_SINGLE
>;
