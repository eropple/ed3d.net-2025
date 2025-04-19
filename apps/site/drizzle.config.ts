import { defineConfig } from "drizzle-kit";
import {
  getNum,
  getStr,
  requireBool,
  requireStr,
} from "node-getenv";

const envVars = {
  host: requireStr("POSTGRES__READWRITE__HOST"),
  port: getNum("POSTGRES__READWRITE__PORT", 5432),
  database: requireStr("POSTGRES__READWRITE__DATABASE"),
  user: requireStr("POSTGRES__READWRITE__USER"),
  password: requireStr("POSTGRES__READWRITE__PASSWORD"),
  ssl: requireBool("POSTGRES__READWRITE__SSL"),
};

const buildPostgresConnectionString = (envVars) => {
  const escapedPassword = encodeURIComponent(envVars.password);
  const sslMode = envVars.ssl ? "require" : "disable";
  return `postgres://${envVars.user}:${escapedPassword}@${envVars.host}:${envVars.port}/${envVars.database}?sslmode=${sslMode}`;
};

export default defineConfig({
  schema: ["./src/lib/server/db/schema/index.ts", "./src/lib/server/db/schema/app-meta.ts"],
  dialect: "postgresql",
  out: "./migrations",
  dbCredentials: {
    url: buildPostgresConnectionString(envVars),
  },
  verbose: true,
  strict: getStr("NODE_ENV") !== "development",
  casing: "snake_case",
});
