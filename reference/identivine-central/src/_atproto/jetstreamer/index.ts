import { getCurrentGitCommit } from "@myapp/shared-universal/utils/app-version.js";
import {
  buildStandardLogger,
  loggerWithLevel,
} from "@myapp/shared-universal/utils/logging.js";
import { drizzle } from "drizzle-orm/node-postgres";
import sleep from "sleep-promise";

import { buildDbPoolFromConfig } from "../../lib/datastores/postgres/builder.server.js";
import { buildDrizzleLogger } from "../../lib/datastores/postgres/query-logger.server.js";

import { loadJetstreamerAppConfigFromEnv } from "./config/env-loader.js";
import { JetstreamerServer } from "./server.js";

export async function jetstreamerMain() {
  const config = loadJetstreamerAppConfigFromEnv();
  const logger = buildStandardLogger("jetstreamer", config.logLevel, {
    useStdout: false,
    prettyPrint: config.prettyLogs,
  });

  const currentCommit = await getCurrentGitCommit();

  logger.info(
    { currentCommit },
    `Jetstreamer (release ${currentCommit}) constructed.`,
  );

  const dbPool = buildDbPoolFromConfig(
    "jetstreamer",
    logger,
    config.postgres.readwrite,
  );

  const db = drizzle(dbPool, {
    logger: buildDrizzleLogger(
      loggerWithLevel(logger, config.postgres.readwrite.logLevel, {
        component: "drizzle",
      }),
    ),
    casing: "snake_case",
  });

  const jetstreamer = new JetstreamerServer(logger, config.jetstreamer, db);

  await jetstreamer.start();

  let close: boolean = false;

  const signals = ["SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR2"];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}; shutting down.`);
      await jetstreamer.stop();
      logger.info(`Server shut down.`);

      close = true;
    });
  }

  while (!close) {
    await sleep(1000);
  }

  return;
}
