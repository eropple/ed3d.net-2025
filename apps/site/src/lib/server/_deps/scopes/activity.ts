import { asValue, type AwilixContainer } from "awilix";

import type { AppSingletonCradle } from "./singleton.js";

export type AppActivityCradle = AppSingletonCradle & {

}

export async function configureActivityScope(
  singletonContainer: AwilixContainer<AppSingletonCradle>,
  activityId: string,
): Promise<AwilixContainer<AppActivityCradle>> {
  const requestContainer = singletonContainer.createScope<AppActivityCradle>();

  const logger = requestContainer.cradle.logger.child({ activityId });

  requestContainer.register({
    logger: asValue(logger),
  });

  return requestContainer;
}
