import { asFunction, asValue, type AwilixContainer } from "awilix";
import { makeSafeQueryRunner } from "groqd";

import { BlogPostService } from "../../domain/blogs/service.js";
import { UserService } from "../../domain/users/service.js";

import type { AppSingletonCradle } from "./singleton.js";

export type AppRequestCradle = AppSingletonCradle & {
  users: UserService;
  blogPosts: BlogPostService;

  // Sanity query runners
  sanityQueryCdn: ReturnType<typeof makeSafeQueryRunner>;
  sanityQueryDirect: ReturnType<typeof makeSafeQueryRunner>;
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

    // Sanity query runners
    sanityQueryCdn: asFunction(({
      logger,
      sanityCdn
    }: AppRequestCradle) => {
      return makeSafeQueryRunner((query, { parameters }) => {
        logger.debug({
          sanity: true,
          cdn: true,
          query,
          parameters
        }, "Executing Sanity CDN query");

        return sanityCdn.fetch(query, parameters);
      });
    }),

    sanityQueryDirect: asFunction(({
      logger,
      sanityDirect
    }: AppRequestCradle) => {
      return makeSafeQueryRunner((query, { parameters }) => {
        logger.debug({
          sanity: true,
          direct: true,
          query,
          parameters
        }, "Executing Sanity Direct query");

        return sanityDirect.fetch(query, parameters);
      });
    }),

    // Blog post service
    blogPosts: asFunction(({
      logger,
      config,
      sanityCdn,
      sanityDirect,
      sanityQueryCdn,
      sanityQueryDirect
    }: AppRequestCradle) => {
      return new BlogPostService(
        logger,
        sanityCdn,
        sanityDirect,
        sanityQueryCdn,
        sanityQueryDirect,
        config.sanity.content
      );
    }),
  });

  return requestContainer;
}
