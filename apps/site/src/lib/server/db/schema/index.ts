import type { NodeSavedSession, NodeSavedState } from "@atproto/oauth-client-node";
import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import cryptoRandomString from "crypto-random-string";
import { pgTable, uuid, timestamp, text, boolean, jsonb, pgEnum, integer, unique, index, doublePrecision, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import ms from "ms";
import type { Node } from "prosemirror-model";
import { ulid, ulidToUUID } from "ulidx";

import type { CommentId } from "../../../domain/comments/ids.js";
import type { TextId, TextRevisionId } from "../../../domain/texts/ids.js";
import { type StringUUID } from "../../../ext/typebox/index.js";
import type { Sensitive } from "../../vault/types.js";



export const ULIDAsUUID = (columnName?: string) =>
  (columnName ? uuid(columnName) : uuid())
    .$default(() => ulidToUUID(ulid()))
    .$type<StringUUID>();

// ---------- MIXINS ---------------------- //
export const CREATED_AT_MIXIN = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
};

export const UPDATED_AT_MIXIN = {
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }).$onUpdateFn(() => new Date()),
};

export const TIMESTAMPS_MIXIN = {
  ...CREATED_AT_MIXIN,
  ...UPDATED_AT_MIXIN,
};

export const S3_LOCATOR_MIXIN = {
  bucket: text("bucket").notNull(),
  objectName: text("object_name").notNull(),
};


// ---------- DOMAIN OBJECTS ---------------------- //

export const USER_EMAIL_LINK_TYPES = pgEnum("user_link_types", ["login", "verify"]);

export const USERS = pgTable("users", {
  userUuid: ULIDAsUUID().primaryKey(),

  username: text().notNull().unique(),

  email: text().notNull().unique(),
  emailVerifiedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),

  disabledAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),

  /**
   * Increment this value to invalidate all existing tokens.
   */
  tokenSalt: integer().notNull().default(1),

  ...TIMESTAMPS_MIXIN,
});
export type DBUser = typeof USERS.$inferSelect;

export const MAGIC_LINKS = pgTable("magic_links", {
  magicLinkUuid: ULIDAsUUID().primaryKey(),

  // The email address this link was sent to
  email: text("email").notNull(),

  // Type of magic link (reusing the existing enum)
  type: USER_EMAIL_LINK_TYPES("type").notNull(),

  // Generated token for the magic link
  token: text("token")
    .notNull()
    .unique()
    .$defaultFn(() => cryptoRandomString({ length: 32, type: "distinguishable" })),

  // Optional reference to a user (if the link is for an existing user)
  userUuid: ULIDAsUUID("user_uuid")
    .references(() => USERS.userUuid),

  // When the link expires
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull().$defaultFn(() => new Date(Date.now() + ms("15m"))),

  // When the link was used (null if unused)
  usedAt: timestamp("used_at", {
    withTimezone: true,
    mode: "date",
  }),

  // Add column to store the redirect path
  redirectPath: text("redirect_path"), // Nullable text column

  ...CREATED_AT_MIXIN,
}, (t) => [
  // Index for fast lookups by token
  index("magic_links_token_idx").on(t.token),
  // Index for finding a user's links
  index("magic_links_user_idx").on(t.userUuid),
  // Index for checking unused links
  index("magic_links_unused_idx").on(t.usedAt, t.expiresAt)
]);
export type DBMagicLink = typeof MAGIC_LINKS.$inferSelect;

export const SOCIAL_OAUTH2_PROVIDER_KIND = pgEnum(
  "social_oauth2_provider_kind",
  ["github", "google", "discord"],
);

export const SocialOAuth2ProviderKind = Type.Union(
  SOCIAL_OAUTH2_PROVIDER_KIND.enumValues.map(value => Type.Literal(value))
);
export type SocialOAuth2ProviderKind = Static<typeof SocialOAuth2ProviderKind>;
export const SocialOAuth2ProviderKindChecker = TypeCompiler.Compile(SocialOAuth2ProviderKind);

export const USER_SOCIAL_OAUTH2_IDENTITIES = pgTable("user_social_oauth2_identities", {
  userSocialOAuth2IdentityUuid: ULIDAsUUID().primaryKey(),

  userUuid: ULIDAsUUID()
    .references(() => USERS.userUuid)
    .notNull(),

  provider: SOCIAL_OAUTH2_PROVIDER_KIND("provider").notNull(),
  providerId: text("provider_id").notNull(),
  providerUsername: text("provider_username").notNull(),

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

  ...TIMESTAMPS_MIXIN,
}, (t) => [
  unique("one_provider_row_per_user").on(t.userUuid, t.provider),
  unique("unique_provider_identity").on(t.provider, t.providerId)
]);
export type DBUserSocialOAuth2Identity = typeof USER_SOCIAL_OAUTH2_IDENTITIES.$inferSelect;

// this is bolted into the atproto agent stuff they make you use, so
// we can't do a ton to customize it.
export const ATPROTO_SESSIONS = pgTable("atproto_sessions", {
  key: text().primaryKey(),
  sessionData: jsonb().$type<Sensitive<NodeSavedSession>>().notNull(),
  ...TIMESTAMPS_MIXIN,
});

export const ATPROTO_STATES = pgTable("atproto_states", {
  key: text().primaryKey(),
  stateData: jsonb().$type<Sensitive<NodeSavedState>>().notNull(),
  ...TIMESTAMPS_MIXIN,
});

export const USER_ATPROTO_IDENTITIES = pgTable("user_atproto_identities", {
  userAtprotoIdentityUuid: ULIDAsUUID().primaryKey(),

  userUuid: uuid()
    .references(() => USERS.userUuid)
    .notNull(),

  did: text().notNull().unique(),
  handle: text().notNull(),
  profileData: jsonb().$type<Sensitive<Record<string, unknown>>>().notNull(),

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

  ...TIMESTAMPS_MIXIN,
});
export type DBUserAtprotoIdentity = typeof USER_ATPROTO_IDENTITIES.$inferSelect;

export const USER_SESSIONS = pgTable("user_sessions", {
  sessionUuid: ULIDAsUUID().primaryKey(),

  userUuid: ULIDAsUUID()
    .references(() => USERS.userUuid)
    .notNull(),

  tokenHash: text("token_hash").notNull(),

  expiresAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),

  lastAccessedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }).notNull().defaultNow(),

  revokedAt: timestamp({
    withTimezone: true,
    mode: "date",
  }),

  ...TIMESTAMPS_MIXIN,
});
export type DBUserSession = typeof USER_SESSIONS.$inferSelect;

export const TEXTS = pgTable("texts", {
  textUuid: ULIDAsUUID("text_uuid").primaryKey(),
  revisionUuid: ULIDAsUUID("revision_uuid").notNull(),
  kind: text("kind").notNull(),
  contentJson: jsonb("content_json").notNull().$type<Node>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
}, (t) => [{
  compoundKey: primaryKey({ columns: [t.textUuid, t.revisionUuid] }),
  textUuidIdx: index("texts_text_uuid_idx").on(t.textUuid),
}]);
export type DBText = typeof TEXTS.$inferSelect;

export const BLOG_POST_COMMENTS = pgTable("blog_post_comments", {
  commentUuid: ULIDAsUUID("comment_uuid").primaryKey(),

  sanityBlogPostId: text("sanity_blog_post_id").notNull(),
  userUuid: ULIDAsUUID("user_uuid")
    .references(() => USERS.userUuid, { onDelete: "cascade" })
    .notNull(),
  parentCommentUuid: ULIDAsUUID("parent_comment_uuid"),

  textUuid: ULIDAsUUID("text_uuid")
    .notNull()
    .unique(),

  ...TIMESTAMPS_MIXIN,
}, (t) => [{
  parentCommentFk: foreignKey({
    columns: [t.parentCommentUuid],
    foreignColumns: [t.commentUuid],
    name: "blog_post_comments_parent_fk",
  }).onDelete("cascade"),

  sanityPostIdIdx: index("comments_sanity_post_id_idx").on(t.sanityBlogPostId),
  userIdx: index("comments_user_id_idx").on(t.userUuid),
  parentCommentIdx: index("comments_parent_comment_idx").on(t.parentCommentUuid),
}]);
export type DBBlogPostComment = typeof BLOG_POST_COMMENTS.$inferSelect;
