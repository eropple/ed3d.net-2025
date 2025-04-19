import { migrate } from "drizzle-orm/node-postgres/migrator";
import { findUpSync } from "find-up";

import type { AppSingletonCradle } from "../_deps/scopes/singleton";

export async function doDatabaseMigration(
  deps: AppSingletonCradle,
): Promise<void> {
  const { logger, db } = deps;

  const packageJson = findUpSync("package.json", {
    cwd: import.meta.url,
  });
  if (!packageJson) {
    throw new Error("Could not find package.json");
  }

  const migrationsDir = packageJson.replace("package.json", "migrations");
  logger.info({ migrationsDir }, "Running migrations");
  await migrate(db, {
    migrationsFolder: migrationsDir,
  });
  logger.info("Migrations complete");
}
