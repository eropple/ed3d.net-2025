import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { Logger } from "pino";

import type { LogLevel } from "../_config/types/log-level.js";
import { loggerWithLevel } from "../utils/logging.js";

import type { PostgresHostConfig } from "./config.js";
import { buildDrizzleLogger } from "./query-logger.js";
import * as schema from "./schema/index.js";


export function buildDbPoolFromConfig(
  name: string,
  logger: Logger,
  hostConfig: PostgresHostConfig,
) {
  let poolLoggerFn: pg.PoolConfig["log"] = undefined;
  if (hostConfig.logLevel !== "silent") {
    logger = logger.child({ component: `pg_${name}` });

    logger.level = hostConfig.logLevel;

    poolLoggerFn = (...messages: unknown[]) => {
      for (const msg of messages) {
        logger.debug(msg);
      }
    };
  }

  return new pg.Pool({
    ...hostConfig,
    application_name: `pg_${name}`,
    log: poolLoggerFn,
  });
}

export function buildDrizzle(logger: Logger, pool: pg.Pool, name: string, logLevel: LogLevel) {
  return drizzle(pool, {
    logger: buildDrizzleLogger(
      loggerWithLevel(logger, logLevel, {
        component: name,
      }),
    ),
    casing: "snake_case",
    schema,
  });
}

