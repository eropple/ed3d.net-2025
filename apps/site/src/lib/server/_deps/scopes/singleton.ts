import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { createClient, type SanityClient } from "@sanity/client";
import {
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer,
} from "awilix";
import { makeSafeQueryRunner } from "groqd";
import Redis from "ioredis";
import type * as pg from "pg";
import type { Logger } from "pino";
import type { StaleWhileRevalidate } from "stale-while-revalidate-cache";
import type { DeepReadonly } from "utility-types";


import { ATProtoService } from "../../auth/atproto/service.js";
import { AuthService } from "../../auth/service.js";
import { SessionService } from "../../auth/session/service.js";
import { SocialIdentityService } from "../../auth/social-identity/service.js";
import { BlogPostService } from "../../domain/blogs/service.js";
import { TextService } from "../../domain/texts/service.js";
import { UserService } from "../../domain/users/service.js";
import { VaultKeyStore } from "../../vault/keystore.js";
import { VaultService } from "../../vault/service.js";

import type { AppRequestCradle } from "./request.js";

import type { AppConfig } from "$lib/server/_config/types";
import { createATProtoOAuthClient } from "$lib/server/auth/atproto/client-factory.js";
import { buildDbPoolFromConfig, buildDrizzle } from "$lib/server/db/builders.js";
import type { Drizzle, DrizzleRO } from "$lib/server/db/types";
import { EmailService } from "$lib/server/email/service.js";
import { buildMemorySwrCache } from "$lib/server/swr/memory";
import { buildRedisSWRCache } from "$lib/server/swr/redis.js";
import { buildTemporalConnection, TemporalClientService, type TemporalClient } from "$lib/server/temporal";
import { loggedFetch, type FetchFn } from "$lib/server/utils/fetch";


// eslint-disable-next-line no-restricted-globals
const globalFetch = fetch;

export type AppSingletonCradle = {
  config: DeepReadonly<AppConfig>;
  logger: Logger;
  fetch: FetchFn;

  dbROPool: pg.Pool;
  dbPool: pg.Pool;

  dbRO: DrizzleRO;
  db: Drizzle;

  redis: Redis;
  redisSWR: StaleWhileRevalidate;
  memorySWR: StaleWhileRevalidate;

  temporalClient: Promise<TemporalClient>;
  temporal: TemporalClientService;

  // Sanity clients
  sanityCdn: SanityClient;
  sanityDirect: SanityClient;

  // domain objects too expensive to build on request go here
  vaultKeyStore: VaultKeyStore;
  vault: VaultService;

  atprotoOAuthClient: Promise<NodeOAuthClient>;

  users: UserService;
  blogPosts: BlogPostService;
  textService: TextService;

  // Sanity query runners
  sanityQueryCdn: ReturnType<typeof makeSafeQueryRunner>;
  sanityQueryDirect: ReturnType<typeof makeSafeQueryRunner>;

  // Auth services
  authService: AuthService;
  atprotoService: ATProtoService;
  socialIdentityService: SocialIdentityService;
  sessionService: SessionService;

  emailService: EmailService;
};

export async function configureBaseAwilixContainer(
  appConfig: AppConfig,
  rootLogger: Logger,
): Promise<AwilixContainer<AppSingletonCradle>> {
  const container = createContainer<AppSingletonCradle>();

  container.register({
    config: asValue(appConfig),
    logger: asValue(rootLogger),
    fetch: asFunction(({ logger }: AppSingletonCradle) =>
      loggedFetch(logger, globalFetch),
    ),

    dbROPool: asFunction(({ config, logger }: AppSingletonCradle) => {
      return buildDbPoolFromConfig(
        "readonly",
        logger,
        config.postgres.readonly,
      );
    }).singleton(),

    dbPool: asFunction(({ config, logger }: AppSingletonCradle) => {
      return buildDbPoolFromConfig(
        "readwrite",
        logger,
        config.postgres.readwrite,
      );
    }).singleton(),

    dbRO: asFunction(({ logger, config, dbROPool }: AppSingletonCradle) => buildDrizzle(logger, dbROPool, "drizzle-ro", config.postgres.readonly.logLevel)).singleton(),
    db: asFunction(({ logger, config, dbPool }: AppSingletonCradle) => buildDrizzle(logger, dbPool, "drizzle", config.postgres.readwrite.logLevel)).singleton(),

    redis: asFunction(({ config }: AppSingletonCradle) => {
      return new Redis(config.redis.url);
    }).singleton(),

    redisSWR: asFunction(({ logger, redis }: AppSingletonCradle) =>
      buildRedisSWRCache(logger, false, redis),
    ).singleton(),
    memorySWR: asFunction(({ config, logger }: AppSingletonCradle) =>
      buildMemorySwrCache(config.memorySwr, logger),
    ).singleton(),

    temporalClient: asFunction(({ config }: AppSingletonCradle) => buildTemporalConnection({
      address: config.temporal.address,
      namespace: config.temporal.namespace,
    }).then(({ temporalClient }) => temporalClient)),

    temporal: asFunction(
      ({ logger, temporalClient, config }: AppSingletonCradle) =>
        new TemporalClientService(
          logger,
          temporalClient,
          config.temporal.queues,
        ),
    ),

    // Sanity clients
    sanityCdn: asFunction(({ config }: AppSingletonCradle) => {
      return createClient({
        projectId: config.sanity.projectId,
        dataset: config.sanity.dataset,
        token: config.sanity.token,
        apiVersion: config.sanity.apiVersion,
        useCdn: true,
      });
    }).singleton(),

    sanityDirect: asFunction(({ config }: AppSingletonCradle) => {
      return createClient({
        projectId: config.sanity.projectId,
        dataset: config.sanity.dataset,
        token: config.sanity.token,
        apiVersion: config.sanity.apiVersion,
        useCdn: false,
      });
    }).singleton(),

    vaultKeyStore: asFunction(({ logger, config }: AppSingletonCradle) => {
      return new VaultKeyStore(logger, {
        primaryKey: config.vault.primaryKey,
        legacyKeys: [...config.vault.legacyKeys || []],
      });
    }).singleton(),

    // domain objects too expensive to build on request go here
    atprotoOAuthClient: asFunction(async ({ logger, db, vault, config, fetch }) => {
      return createATProtoOAuthClient(
        logger,
        db,
        vault,
        fetch,
        config.auth.atproto,
        config.urls,
      );
    }),

    vault: asFunction(({ vaultKeyStore }: AppSingletonCradle) => {
      return new VaultService(vaultKeyStore);
    }),

    users: asFunction(({ logger, db, dbRO }: AppRequestCradle) => {
      return new UserService(logger, db, dbRO);
    }),

    textService: asFunction(({ logger, db, dbRO }: AppSingletonCradle) => {
      return new TextService(logger, db, dbRO);
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
      sanityQueryDirect,
      textService,
      users,
      db,
      dbRO
    }: AppRequestCradle) => {
      return new BlogPostService(
        logger,
        sanityCdn,
        sanityDirect,
        sanityQueryCdn,
        sanityQueryDirect,
        config.sanity.content,
        textService,
        users,
        db,
        dbRO
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
      users,
      socialIdentityService,
      atprotoService,
      sessionService,
      emailService,
      config
    }: AppRequestCradle) => {
      return new AuthService(
        logger,
        db,
        users,
        socialIdentityService,
        atprotoService,
        sessionService,
        emailService,
        config.auth,
        config.urls
      );
    }),

    // Session service
    sessionService: asFunction(({ logger, db, dbRO, config, users }: AppRequestCradle) => {
      return new SessionService(logger, db, dbRO, config.auth, users);
    }),

    emailService: asFunction(({ logger, config }: AppSingletonCradle) => {
      return new EmailService(
        logger.child({ service: "email" }),
        config.emailDelivery
      );
    }),
  });

  // we need to kick this forward to ensure the client is initialized
  // and errors throw at app startup
  await container.cradle.atprotoOAuthClient;

  return container;
}
