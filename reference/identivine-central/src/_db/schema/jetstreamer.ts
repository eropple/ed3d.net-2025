import { sql } from "drizzle-orm";
import { bigint, check, pgSchema } from "drizzle-orm/pg-core";

export const jetstreamerSchema = pgSchema("jetstreamer");

// this is a table with a single row that keeps the latest position of
// our jetstream intake. it's updated about once a second.
export const JETSTREAM_CURSOR_SINGLE = jetstreamerSchema.table(
  "cursor",
  {
    value: bigint({
      mode: "number",
    }).primaryKey(),
  },
  (t) => ({
    onlyOneRow: check("only_one_row", sql`${t.value} IS NOT NULL`),
  }),
);
