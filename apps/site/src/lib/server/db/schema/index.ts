import cryptoRandomString from "crypto-random-string";
import { pgTable, uuid, timestamp, text, boolean, jsonb, pgEnum, integer } from "drizzle-orm/pg-core";
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


// ---------- DOMAIN OBJECTS ---------------------- //

export const USERS = pgTable("users", {
  userUuid: ULIDAsUUID().primaryKey(),

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
  userAvatarUuid: ULIDAsUUID().primaryKey(),

  userUuid: uuid()
    .references(() => USERS.userUuid)
    .notNull()
    .unique(),

  ...S3_LOCATOR_MIXIN,
  ...TIMESTAMPS_MIXIN,
});

export const USER_EMAIL_VERIFICATION_TOKENS = pgTable(
  "user_email_verification_tokens",
  {
    userUuid: uuid()
      .references(() => USERS.userUuid)
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