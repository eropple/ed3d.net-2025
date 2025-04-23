import type { NodeSavedSession, NodeSavedState } from "@atproto/oauth-client-node";
import type { Static } from "@sinclair/typebox";
import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import cryptoRandomString from "crypto-random-string";
import { pgTable, uuid, timestamp, text, boolean, jsonb, pgEnum, integer, unique, index, doublePrecision } from "drizzle-orm/pg-core";
import ms from "ms";
import { ulid, ulidToUUID } from "ulidx";

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

export const USER_EMAIL_LINKS = pgTable("user_email_links", {
  userEmailLinkUuid: ULIDAsUUID().primaryKey(),

  userUuid: uuid()
    .references(() => USERS.userUuid)
    .notNull(),

  type: USER_EMAIL_LINK_TYPES("type").notNull(),
  token: text("token").notNull().$defaultFn(() => cryptoRandomString({ length: 32, type: "distinguishable" })),


  expiresAt: timestamp({
    withTimezone: true,
    mode: "date",
  }).notNull().$defaultFn(() => new Date(Date.now() + ms("15m"))),

  ...CREATED_AT_MIXIN,
});
export type DBUserEmailLink = typeof USER_EMAIL_LINKS.$inferSelect;
export const SOCIAL_OAUTH2_PROVIDER_KIND = pgEnum(
  "social_oauth2_provider_kind",
  ["github", "google"],
);

export const SocialOAuth2ProviderKind = Type.Union(
  SOCIAL_OAUTH2_PROVIDER_KIND.enumValues.map(value => Type.Literal(value))
);
export type SocialOAuth2ProviderKind = Static<typeof SocialOAuth2ProviderKind>;
export const SocialOAuth2ProviderKindChecker = TypeCompiler.Compile(SocialOAuth2ProviderKind);

export const USER_SOCIAL_OAUTH2_IDENTITIES = pgTable("user_social_oauth2_identities", {
  userSocialOAuth2IdentityUuid: ULIDAsUUID().primaryKey(),

  userUuid: uuid()
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
  {
    oneProviderRowPerUser: unique("one_provider_row_per_user").on(t.userUuid, t.provider),
  }
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
