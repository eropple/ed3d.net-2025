import { pgTable, uuid, timestamp, text, boolean, jsonb } from "drizzle-orm/pg-core";
import { ulid, ulidToUUID } from "ulidx";

import { type StringUUID } from "../../../ext/typebox/index.js";


export const ULIDAsUUID = (columnName?: string) =>
  (columnName ? uuid(columnName) : uuid())
    .$default(() => ulidToUUID(ulid()))
    .$type<StringUUID>();

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

export const users = pgTable("users", {
  userUuid: ULIDAsUUID("user_uuid").primaryKey(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").default(false),
  username: text("username").notNull().unique(),
  providerUserId: text("provider_user_id").notNull().unique(),
  providerUsername: text("provider_username").notNull(),
  providerIdentity: jsonb("provider_identity").notNull(),

  lastAccessedAt: timestamp("last_accessed_at", {
    withTimezone: true,
    mode: "date"
  }),
  disabledAt: timestamp("disabled_at", {
    withTimezone: true,
    mode: "date"
  }),

  ...TIMESTAMPS_MIXIN,
});

export type DBUser = typeof users.$inferSelect;
export type DBNewUser = typeof users.$inferInsert;

export const userSessions = pgTable("user_sessions", {
  sessionUuid: ULIDAsUUID("session_uuid").primaryKey(),
  userUuid: ULIDAsUUID("user_uuid")
    .notNull()
    .references(() => users.userUuid, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  lastAccessedAt: timestamp("last_accessed_at", {
    withTimezone: true,
    mode: "date"
  })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", {
    withTimezone: true,
    mode: "date"
  }),

  ...TIMESTAMPS_MIXIN,
});

export type DBUserSession = typeof userSessions.$inferSelect;
export type DBNewUserSession = typeof userSessions.$inferInsert;
