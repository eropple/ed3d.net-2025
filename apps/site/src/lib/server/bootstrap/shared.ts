import type { AppConfig } from "../_config/types/index.js";
import { configureBaseAwilixContainer } from "../_deps/scopes/singleton.js";
import { doDatabaseMigration } from "../db/migrator.js";
import { seed } from "../seeds/index.js";
import { buildStandardLogger } from "../utils/logging.js";

export type BootstrapArgs = {
  skipMigrations?: boolean | "skip-in-development";
};

const defaultBootstrapArgs: BootstrapArgs = {
  skipMigrations: "skip-in-development"
};

export async function bootstrapFromConfig<TAppConfig extends AppConfig>(
  loggerName: string,
  config: TAppConfig,
  args: BootstrapArgs = {},
) {
  const ROOT_LOGGER = buildStandardLogger(loggerName, config.logLevel, {
    useStdout: false,
    prettyPrint: config.prettyLogs,
  });

  args = {
    ...defaultBootstrapArgs,
    ...args
  };

  const SINGLETON_CONTAINER = await configureBaseAwilixContainer(
    config,
    ROOT_LOGGER,
  );

  const shouldSkipMigrations =
    args.skipMigrations === true ||
    (args.skipMigrations === "skip-in-development" &&
      config.env === "development");
  if (!shouldSkipMigrations) {
    ROOT_LOGGER.info("doing DB migration at startup");
    await doDatabaseMigration(SINGLETON_CONTAINER.cradle);
    ROOT_LOGGER.info("doing seeding at startup");
    await seed(config.env, SINGLETON_CONTAINER.cradle);
  }

  return { APP_CONFIG: config, ROOT_LOGGER, SINGLETON_CONTAINER };
}
