import cryptoRandomString from "crypto-random-string";
import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { ulid, ulidToUUID } from "ulidx";

import { type ContentBlockRenderSettings } from "../../domain/content-blocks/schemas/content-block-rendering/index.js";
import { type RichText } from "../../domain/rich-text/schemas.js";
import {
  type SiteSettingsV1,
  type SiteSettings,
} from "../../domain/sites/schemas/site-settings.js";
import { type Sensitive } from "../../domain/vault/schemas.js";

// ---------- HELPER TYPES ---------------------- //
export const ULIDAsUUID = (columnName?: string) =>
  (columnName ? uuid(columnName) : uuid()).$default(() => ulidToUUID(ulid()));

export const IDENTITY_STATUS = pgEnum("identity_status", [
  "verified",
  "unverified",
  "revoked",
]);

// ---------- MIXINS ---------------------- //
export const TIMESTAMPS_MIXIN = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }).$onUpdateFn(() => new Date()),
};

export const S3_LOCATOR_MIXIN = {
  bucket: text("bucket").notNull(),
  objectName: text("object_name").notNull(),
};

export const IDENTITY_STATUS_MIXIN = {
  status: IDENTITY_STATUS().notNull().default("unverified"),
  statusLastCheckedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }).notNull(),
};

export const STANDARD_OAUTH2_PROVIDER_DATA = {
  accessToken: jsonb().$type<Sensitive<string>>().notNull(),
  refreshToken: jsonb().$type<Sensitive<string>>(),
  lastRefreshedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),
  providerMetadata: jsonb()
    .$type<Sensitive<Record<string, unknown>>>()
    .notNull(),
  expiresAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),

  scopes: text().array().notNull(),
};

// ---------------------- USERS ---------------------- //
export const PASSWORD_ALGORITHMS = pgEnum("password_algorithm", ["argon2"]);

export const USERS = pgTable("users", {
  userId: ULIDAsUUID().primaryKey(),

  displayName: text().notNull().unique(),

  email: text().notNull().unique(),
  emailVerifiedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),

  active: boolean().notNull().default(true),

  /**
   * Increment this value to invalidate all existing tokens.
   */
  tokenSalt: integer().notNull().default(1),

  ...TIMESTAMPS_MIXIN,
});

export const USER_AVATARS = pgTable("user_avatars", {
  userAvatarId: ULIDAsUUID().primaryKey(),

  userId: uuid()
    .references(() => USERS.userId)
    .notNull()
    .unique(),

  ...S3_LOCATOR_MIXIN,
  ...TIMESTAMPS_MIXIN,
});

export const USER_EMAIL_VERIFICATION_TOKENS = pgTable(
  "user_email_verification_tokens",
  {
    userId: uuid()
      .references(() => USERS.userId)
      .notNull(),
    token: text("token")
      .notNull()
      .unique()
      .$default(() =>
        cryptoRandomString({ length: 32, type: "distinguishable" }),
      ),

    expiresAt: timestamp({
      withTimezone: true,
      mode: "date",
    }).notNull(),

    ...TIMESTAMPS_MIXIN,
  },
);

export const USER_LOCAL_CREDENTIALS = pgTable("user_local_credentials", {
  userId: uuid("user_id")
    .references(() => USERS.userId)
    .notNull()
    .unique(),
  algorithm: PASSWORD_ALGORITHMS("algorithm").notNull(),
  hash: text("hash").notNull(),

  ...TIMESTAMPS_MIXIN,
});

// ---------------------- SITES ---------------------- //
export const SITE_TIER = pgEnum("site_tier", [
  "standard",
  "plus",
  "professional",
]);

export const SITES = pgTable("sites", {
  userId: uuid()
    .references(() => USERS.userId)
    .notNull()
    .unique(),
  siteId: ULIDAsUUID().primaryKey(),

  title: text().notNull(),
  // NOTE: this is a slatejs serialized jsonb
  blurb: jsonb().$type<RichText>().notNull(),

  tier: SITE_TIER().notNull().default("standard"),
  customCapabilities: text().array().notNull().default([]),

  cssTheme: text().notNull().default("default"),
  customCss: text().notNull().default(""),

  settings: jsonb()
    .$type<SiteSettings>()
    .notNull()
    .default({
      version: 1,
      showContainerTitles: true,
    } satisfies SiteSettingsV1),

  publishedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),
  ...TIMESTAMPS_MIXIN,
});

// - site uses our subdomain
// - LATER: site uses a custom domain we manage via third-party DNS API
// - site uses a custom domain we DON'T manage via API (manual config by user)
// - LATER: site uses a custom domain bought through us

export const SITE_DOMAIN_CONTROL_SOURCE = pgEnum("site_domain_control_source", [
  "subdomain",
  "custom-nonhosted",
]);

export const SITE_DOMAINS = pgTable("site_domains", {
  siteDomainId: ULIDAsUUID().primaryKey(),
  siteId: uuid()
    .references(() => SITES.siteId)
    .notNull(),
  fqdn: text().notNull(),

  controlSource: SITE_DOMAIN_CONTROL_SOURCE().notNull(),

  ...TIMESTAMPS_MIXIN,
});

export const SITE_AVATARS = pgTable("site_avatars", {
  siteAvatarId: ULIDAsUUID().primaryKey(),
  siteId: uuid()
    .references(() => SITES.siteId)
    .notNull(),
  imageId: uuid()
    .references(() => IMAGES.imageId)
    .notNull(),
  ...TIMESTAMPS_MIXIN,
});

export const SITE_HEADER_IMAGES = pgTable("site_header_images", {
  siteHeaderImageId: ULIDAsUUID().primaryKey(),
  siteId: uuid()
    .references(() => SITES.siteId)
    .notNull(),
  imageId: uuid()
    .references(() => IMAGES.imageId)
    .notNull(),
  ...TIMESTAMPS_MIXIN,
});

// ---------------------- CONTENT ---------------------- //

export const SITE_CONTENT_CONTAINERS = pgTable(
  "site_content_containers",
  {
    siteContentContainerId: ULIDAsUUID().primaryKey(),
    siteId: uuid()
      .references(() => SITES.siteId)
      .notNull(),

    title: text(),
    order: doublePrecision().notNull(),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => ({}),
);

export const SITE_CONTENT_BLOCKS = pgTable(
  "site_content_blocks",
  {
    siteContentBlockId: ULIDAsUUID().primaryKey(),

    siteContentContainerId: uuid()
      .references(() => SITE_CONTENT_CONTAINERS.siteContentContainerId)
      .notNull(),

    order: doublePrecision().notNull(),

    active: boolean().notNull().default(true),

    blockKind: text("block_kind").generatedAlwaysAs(
      (): SQL => sql`${SITE_CONTENT_BLOCKS.renderSettings}->>'kind'::text`,
    ),

    blockVersion: integer("block_version").generatedAlwaysAs(
      (): SQL =>
        sql`(${SITE_CONTENT_BLOCKS.renderSettings}->>'version')::integer`,
    ),

    renderSettings: jsonb().$type<ContentBlockRenderSettings>().notNull(),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => ({
    settingsCheckConstraint: check(
      "settingsJsonConstraint",
      sql`
      jsonb_typeof(${t.renderSettings}) = 'object'
      AND ${t.renderSettings} ? 'kind'
      AND ${t.renderSettings} ? 'version'
      AND ${t.renderSettings} ? 't'
      AND jsonb_typeof(${t.renderSettings}->'kind') = 'string'
      AND jsonb_typeof(${t.renderSettings}->'version') = 'number'
      AND ${t.renderSettings}->>'t' = 'cr'`,
    ),
  }),
);

// ------------- IDENTITIES ------------- //

export const SOCIAL_OAUTH2_PROVIDER_KIND = pgEnum(
  "social_oauth2_provider_kind",
  ["github", "gitlab", "threads", "tiktok", "youtube", "twitch"],
);

export const SITE_SOCIAL_OAUTH2_IDENTITIES = pgTable(
  "site_social_oauth2_identities",
  {
    socialOAuth2IdentityId: ULIDAsUUID(
      "social_oauth2_identity_id",
    ).primaryKey(),
    siteId: uuid()
      .notNull()
      .references(() => SITES.siteId),

    provider: SOCIAL_OAUTH2_PROVIDER_KIND().notNull(),
    providerId: text().notNull(),
    providerUsername: text().notNull(),
    displayOnSite: boolean().notNull().default(true),
    order: doublePrecision().notNull(),

    ...IDENTITY_STATUS_MIXIN,

    ...STANDARD_OAUTH2_PROVIDER_DATA,

    ...TIMESTAMPS_MIXIN,
  },
  (t) => ({
    oneProviderConstraint: unique().on(t.siteId, t.provider),
    singleOAuth2UserIdConstraint: unique().on(t.provider, t.providerId),
  }),
);

export const MASTODON_APPS = pgTable(
  "mastodon_apps",
  {
    mastodonAppId: ULIDAsUUID("mastodon_app_id").primaryKey(),
    instanceUrl: text().notNull(),
    clientId: jsonb().$type<Sensitive<string>>().notNull(),
    clientSecret: jsonb().$type<Sensitive<string>>().notNull(),
    scopes: text().notNull(),
    revoked: boolean().notNull().default(false),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => ({
    // TODO:  we need one app per instanceUrl/scopes pair that is NOT revoked
    //        this requires a generated column so I skipped it for now.

    lookupIndex: index("lookup_index").on(t.instanceUrl, t.scopes),
  }),
);

export const SITE_MASTODON_IDENTITIES = pgTable(
  "site_mastodon_identities",
  {
    mastodonIdentityId: ULIDAsUUID("mastodon_identity_id").primaryKey(),
    mastodonAppId: uuid()
      .notNull()
      .references(() => MASTODON_APPS.mastodonAppId),
    siteId: uuid()
      .notNull()
      .references(() => SITES.siteId),

    providerId: text().notNull(),
    username: text().notNull(),
    email: text(),
    displayOnSite: boolean().notNull().default(true),
    order: doublePrecision().notNull(),

    ...IDENTITY_STATUS_MIXIN,

    ...STANDARD_OAUTH2_PROVIDER_DATA,

    ...TIMESTAMPS_MIXIN,
  },
  (t) => ({
    // One identity per site per instance
    siteInstanceConstraint: unique().on(t.siteId, t.mastodonAppId),
  }),
);

export const ATPROTO_SESSIONS = pgTable("atproto_sessions", {
  key: text().primaryKey(),
  sessionData: jsonb().$type<Sensitive<unknown>>().notNull(),
  ...TIMESTAMPS_MIXIN,
});

// we do NOT have access token/refresh token in here because the ATProto
// client handles that (that's why we have the `atproto_sessions` table
// above). This should store only the minimal necessary data to permanently
// identify a user; right now this means `did` and `handle`.
export const SITE_ATPROTO_IDENTITIES = pgTable(
  "site_atproto_identities",
  {
    atprotoIdentityId: ULIDAsUUID("atproto_identity_id").primaryKey(),
    siteId: uuid()
      .notNull()
      .references(() => SITES.siteId)
      .unique(),

    did: text().notNull().unique(),
    handle: text().notNull(),
    profileData: jsonb().$type<Sensitive<Record<string, unknown>>>().notNull(),
    displayOnSite: boolean().notNull().default(true),
    order: doublePrecision().notNull(),

    ...IDENTITY_STATUS_MIXIN,

    ...TIMESTAMPS_MIXIN,
  },
  (t) => ({}),
);

export const WEB_VERIFICATION_METHOD = pgEnum("web_verification_method", [
  "meta-tag",
  "rel-me",
  "well-known",
  "dns-txt",
]);

export const SITE_WEB_IDENTITIES = pgTable(
  "site_web_identities",
  {
    webIdentityId: ULIDAsUUID("web_identity_id").primaryKey(),
    siteId: uuid()
      .notNull()
      .references(() => SITES.siteId),

    url: text().notNull(),
    verificationMethod: WEB_VERIFICATION_METHOD(), // null if unverified
    displayOnSite: boolean().notNull().default(true),
    order: doublePrecision().notNull(),

    lastVerificationAttempt: timestamp({
      withTimezone: true,
      mode: "date",
    }),

    ...IDENTITY_STATUS_MIXIN,
    ...TIMESTAMPS_MIXIN,
  },
  (t) => ({
    siteUrlConstraint: unique().on(t.siteId, t.url),
  }),
);

// ------------ IMAGE UPLOADS ------------- //
export const S3_BUCKET_NAME = pgEnum("s3_bucket_name", [
  "core",
  "user-public-content",
  "user-signed-access",
  "upload-staging",
]);

export const IMAGE_RENDITION_FORMAT = pgEnum("image_rendition_format", [
  "fallback",
  "image/webp",
  "image/avif",
]);

export const IMAGE_UPLOADS = pgTable("image_uploads", {
  imageUploadId: ULIDAsUUID().primaryKey(),
  userId: uuid()
    .references(() => USERS.userId)
    .notNull(),
  siteId: uuid()
    .references(() => SITES.siteId)
    .notNull(),

  usage: text("usage").notNull(),
  stagingObjectName: text("staging_object_name").notNull(),

  targetBucket: S3_BUCKET_NAME("target_bucket").notNull(),
  targetPath: text("target_path").notNull(),

  completedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),

  ...TIMESTAMPS_MIXIN,
});

export const IMAGES = pgTable(
  "images",
  {
    imageId: ULIDAsUUID().primaryKey(),
    siteId: uuid()
      .references(() => SITES.siteId)
      .notNull(),

    usage: text("usage").notNull(),
    bucket: S3_BUCKET_NAME("bucket").notNull(),
    path: text("path").notNull(),

    blurhash: text("blurhash"),
    readyRenditions: IMAGE_RENDITION_FORMAT("ready_renditions")
      .array()
      .notNull()
      .default([]),

    imageUploadId: uuid("image_upload_id"),

    ...TIMESTAMPS_MIXIN,
  },
  (t) => ({
    imageUploadIdIndex: index("image_upload_id_index").on(t.imageUploadId),
  }),
);
