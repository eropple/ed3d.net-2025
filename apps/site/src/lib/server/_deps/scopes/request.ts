import { asFunction, asValue, type AwilixContainer } from "awilix";
import { makeSafeQueryRunner } from "groqd";

import { ATProtoService } from "../../auth/atproto/service.js";
import { AuthService } from "../../auth/service.js";
import { SessionService } from "../../auth/session/service.js";
import { SocialIdentityService } from "../../auth/social-identity/service.js";
import { BlogPostService } from "../../domain/blogs/service.js";
import { UserService } from "../../domain/users/service.js";

import type { AppSingletonCradle } from "./singleton.js";

export type AppRequestCradle = AppSingletonCradle & {
  users: UserService;
  blogPosts: BlogPostService;

  // Sanity query runners
  sanityQueryCdn: ReturnType<typeof makeSafeQueryRunner>;
  sanityQueryDirect: ReturnType<typeof makeSafeQueryRunner>;

  // Auth services
  authService: AuthService;
  atprotoService: ATProtoService;
  socialIdentityService: SocialIdentityService;
  sessionService: SessionService;
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

    // Social identity service
    socialIdentityService: asFunction(({ logger, db, vault, users, fetch, config }: AppRequestCradle) => {
      return new SocialIdentityService(
        logger,
        db,
        vault,
        users,
        config.auth.socialIdentity,
        fetch,
        config.urls.frontendBaseUrl
      );
    }),

    // ATProto service
    atprotoService: asFunction(({
      logger,
      db,
      dbRO,
      vault,
      users,
      fetch,
      atprotoOAuthClient
    }: AppRequestCradle) => {
      return new ATProtoService(logger, db, dbRO, vault, users, fetch, atprotoOAuthClient);
    }),

    // Main auth service
    authService: asFunction(({
      logger,
      db,
      dbRO,
      vault,
      users,
      socialIdentityService,
      atprotoService
    }: AppRequestCradle) => {
      return new AuthService(
        logger,
        db,
        dbRO,
        users,
        socialIdentityService,
        atprotoService,
        vault
      );
    }),

    // Session service
    sessionService: asFunction(({ logger, db, dbRO, config, users }: AppRequestCradle) => {
      return new SessionService(logger, db, dbRO, config.auth, users);
    }),
  });

  return requestContainer;
}
