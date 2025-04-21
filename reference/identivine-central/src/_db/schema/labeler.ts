import {
  bigserial,
  boolean,
  pgEnum,
  pgSchema,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const labelerSchema = pgSchema("labeler");

export const LABELS = labelerSchema.table("labels", {
  id: bigserial({
    mode: "number",
  }).primaryKey(),
  src: text().notNull(),
  uri: text().notNull(),
  cid: text(),
  val: text().notNull(),
  neg: boolean().notNull().default(false),
  cts: timestamp({
    withTimezone: true,
    mode: "date",
  }).notNull(),
  exp: timestamp({
    withTimezone: true,
    mode: "date",
  }),
  sig: text().notNull(),
});

export const LABEL_KIND_VALUES = [
  "connected",
  "linked",
  "irl",
  "fishy",
] as const;
export const OUTBOUND_LABEL_KIND = pgEnum(
  "outbound_label_kind",
  LABEL_KIND_VALUES,
);
export const OUTBOUND_LABELS = labelerSchema.table("outbound_labels", {
  id: bigserial({
    mode: "number",
  }).primaryKey(),
  uri: text().notNull(),
  kind: OUTBOUND_LABEL_KIND().notNull(),
  neg: boolean().notNull().default(false),
  exp: timestamp({
    withTimezone: true,
    mode: "date",
  }),
});
