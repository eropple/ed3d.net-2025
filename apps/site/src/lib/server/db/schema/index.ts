import { pgTable, uuid, timestamp, text, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
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
