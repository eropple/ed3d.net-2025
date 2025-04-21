import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "./index";

// This is a utility function to run migrations programmatically if needed
export async function runMigrations() {
  console.log("Running migrations...");

  await migrate(db, { migrationsFolder: "drizzle" });

  console.log("Migrations completed");
}
