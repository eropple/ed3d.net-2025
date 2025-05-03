import { asValue, type AwilixContainer } from "awilix";

import type { AppSingletonCradle } from "./singleton.js";

export type AppRequestCradle = AppSingletonCradle & {

}

export async function configureRequestScope(
  singletonContainer: AwilixContainer<AppSingletonCradle>,
  requestId: string,
): Promise<AwilixContainer<AppRequestCradle>> {
  const requestContainer = singletonContainer.createScope<AppRequestCradle>();

  const logger = requestContainer.cradle.logger.child({ reqId: requestId });

  requestContainer.register({
    logger: asValue(logger),
  });

  return requestContainer;
}
