import { asFunction, asValue, type AwilixContainer } from "awilix";

import { AuthService } from "../../domain/auth/service.js";
import { UserService } from "../../domain/users/service.js";

import type { AppSingletonCradle } from "./singleton.js";

export type AppRequestCradle = AppSingletonCradle & {
  users: UserService;
  auth: AuthService;
}

export async function configureRequestScope(
  singletonContainer: AwilixContainer<AppSingletonCradle>,
  requestId: string,
): Promise<AwilixContainer<AppRequestCradle>> {
  const requestContainer = singletonContainer.createScope<AppRequestCradle>();

  const logger = requestContainer.cradle.logger.child({ reqId: requestId });

  requestContainer.register({
    logger: asValue(logger),

    users: asFunction(({ logger, db, dbRO }: AppRequestCradle) => {
      return new UserService(logger, db, dbRO);
    }),

    auth: asFunction(({
      logger,
      db,
      redis,
      fetch,
      config,
      users,
      oidcConfig
    }: AppRequestCradle) => {
      return new AuthService(
        logger,
        db,
        redis,
        fetch,
        config.auth,
        config.urls,
        users,
        oidcConfig
      );
    }),
  });

  return requestContainer;
}
