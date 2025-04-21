import { type NodeOAuthClient } from "@atproto/oauth-client-node";
import { type LogLevel } from "@myapp/shared-universal/config/types.js";
import {
  loggedFetch,
  type FetchFn,
} from "@myapp/shared-universal/utils/fetch.js";
import { loggerWithLevel } from "@myapp/shared-universal/utils/logging.js";
import {
  initializeZxcvbn,
  type Zxcvbn,
  zxcvbn,
} from "@myapp/shared-universal/utils/zxcvbn.js";
import {
  buildTemporalConnection,
  type TemporalClient,
  TemporalClientService,
} from "@myapp/temporal-client";
import {
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer,
} from "awilix";
import { drizzle } from "drizzle-orm/node-postgres";
import { Redis } from "ioredis";
import type * as pg from "pg";
import type { Logger } from "pino";
import type { StaleWhileRevalidate } from "stale-while-revalidate-cache";
import type { DeepReadonly } from "utility-types";

import { type AppConfig } from "../_config/types.js";
import { createATProtoClient } from "../domain/atproto/client-factory.js";
import { ATProtoIdentityService } from "../domain/atproto/service.js";
import { ContentBlocksService } from "../domain/content-blocks/service.js";
import { EmailDeliveryService } from "../domain/email-delivery/email-delivery-service.js";
import { ImagesService } from "../domain/images/service.js";
import { MastodonIdentityService } from "../domain/mastodon/service.js";
import {
  buildMinioClient,
  ObjectStoreService,
  type MinioClient,
} from "../domain/object-store/service.js";
import { SitesService } from "../domain/sites/service.js";
import { SocialIdentityService } from "../domain/social-identity/service.js";
import { TemporalDispatcher } from "../domain/temporal-dispatcher/index.js";
import { UsersService } from "../domain/users/service.js";
import { VaultKeyStore } from "../domain/vault/keystore.js";
import { VaultService } from "../domain/vault/service.js";
import { WebIdentityService } from "../domain/web-identity/service.js";
import { buildMemorySwrCache } from "../lib/datastores/memory-swr.js";
import { buildDbPoolFromConfig } from "../lib/datastores/postgres/builder.server.js";
import { buildDrizzleLogger } from "../lib/datastores/postgres/query-logger.server.js";
import {
  type Drizzle,
  type DrizzleRO,
} from "../lib/datastores/postgres/types.server.js";
import { buildRedisSWRCache } from "../lib/datastores/redis/swr.js";

// eslint-disable-next-line no-restricted-globals
const globalFetch = fetch;

export type AppBaseCradleItems = {
  config: DeepReadonly<AppConfig>;
  logger: Logger;
  fetch: FetchFn;

  testGizmo: () => void;

  dbROPool: pg.Pool;
  dbPool: pg.Pool;

  dbRO: DrizzleRO;
  db: Drizzle;

  redis: Redis;
  redisSWR: StaleWhileRevalidate;
  memorySWR: StaleWhileRevalidate;

  temporalClient: TemporalClient;
  temporal: TemporalClientService;
  temporalDispatch: TemporalDispatcher;

  // domain objects below here
  emailDelivery: EmailDeliveryService;
  users: UsersService;
  zxcvbn: Zxcvbn;

  _minio: MinioClient;
  s3: ObjectStoreService;
  vaultKeyStore: VaultKeyStore;
  vault: VaultService;
  atprotoOAuthClient: Promise<NodeOAuthClient>;
  atprotoIdentity: ATProtoIdentityService;
  webIdentity: WebIdentityService;

  sites: SitesService;
  socialIdentity: SocialIdentityService;
  mastodonIdentity: MastodonIdentityService;
  contentBlocks: ContentBlocksService;
  images: ImagesService;
};
export type AppSingletonCradle = AppBaseCradleItems & {};

export async function configureBaseAwilixContainer(
  appConfig: AppConfig,
  rootLogger: Logger,
): Promise<AwilixContainer<AppSingletonCradle>> {
  const container = createContainer<AppSingletonCradle>();

  const { temporalClient } = await buildTemporalConnection({
    address: appConfig.temporal.address,
    namespace: appConfig.temporal.namespace,
  });

  container.register({
    config: asValue(appConfig),
    logger: asValue(rootLogger),
    fetch: asFunction(({ logger }: AppSingletonCradle) =>
      loggedFetch(logger, globalFetch),
    ),

    testGizmo: asFunction(({ logger }: AppSingletonCradle) => () => {
      logger.info("testGizmo");
    }),

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

    dbRO: asFunction(({ logger, config, dbROPool }: AppSingletonCradle) => {
      return drizzle(dbROPool, {
        logger: buildDrizzleLogger(
          loggerWithLevel(logger, config.postgres.readonly.logLevel, {
            component: "drizzle-ro",
          }),
        ),
        casing: "snake_case",
      });
    }),

    db: asFunction(({ logger, config, dbPool }: AppSingletonCradle) => {
      return drizzle(dbPool, {
        logger: buildDrizzleLogger(
          loggerWithLevel(logger, config.postgres.readwrite.logLevel, {
            component: "drizzle",
          }),
        ),
        casing: "snake_case",
      });
    }),

    redis: asFunction(({ config }: AppSingletonCradle) => {
      return new Redis(config.redis.url);
    }).singleton(),

    redisSWR: asFunction(({ config, logger, redis }: AppSingletonCradle) =>
      buildRedisSWRCache(logger, config.redis.logSwrEvents, redis),
    ).singleton(),

    memorySWR: asFunction(({ config, logger }: AppSingletonCradle) =>
      buildMemorySwrCache(config.memorySwr, logger),
    ).singleton(),

    temporalClient: asValue(temporalClient),
    temporal: asFunction(
      ({ logger, temporalClient, config }: AppSingletonCradle) =>
        new TemporalClientService(
          logger,
          temporalClient,
          config.temporal.queues,
        ),
    ),
    temporalDispatch: asFunction(
      ({ temporalClient, temporal }: AppSingletonCradle) =>
        new TemporalDispatcher(temporalClient, temporal),
    ),

    vaultKeyStore: asFunction(
      ({ config }: AppSingletonCradle) => new VaultKeyStore(config.vault),
    ).singleton(),
    vault: asFunction(
      ({ vaultKeyStore }: AppSingletonCradle) =>
        new VaultService(vaultKeyStore),
    ).singleton(),

    // --- domain objects below here
    emailDelivery: asFunction(
      ({ config, logger, dbRO, db, temporal }: AppSingletonCradle) =>
        new EmailDeliveryService(
          logger,
          config.emailDelivery,
          dbRO,
          db,
          temporal,
        ),
    ),

    sites: asFunction(
      ({
        logger,
        config,
        db,
        dbRO,
        redisSWR,
        socialIdentity,
        mastodonIdentity: mastodon,
        atprotoIdentity: atproto,
        webIdentity,
        images,
      }: AppSingletonCradle) =>
        new SitesService(
          logger,
          config.sites,
          db,
          dbRO,
          redisSWR,
          socialIdentity,
          mastodon,
          atproto,
          webIdentity,
          images,
        ),
    ),

    users: asFunction(
      ({ logger, config, memorySWR, db, dbRO, zxcvbn }: AppSingletonCradle) =>
        new UsersService(
          logger,
          config.users,
          config.insecureOptions,
          memorySWR,
          db,
          dbRO,
          zxcvbn,
        ),
    ),
    zxcvbn: asFunction(({ fetch }: AppSingletonCradle) => {
      initializeZxcvbn(fetch);
      return zxcvbn();
    }).singleton(),

    _minio: asFunction(({ logger, config }: AppSingletonCradle) => {
      return buildMinioClient(logger, config.s3);
    }).singleton(),

    s3: asFunction(
      ({ logger, _minio, fetch, config }: AppSingletonCradle) =>
        new ObjectStoreService(
          logger,
          _minio,
          fetch,
          config.urls,
          config.s3.buckets,
        ),
    ),
    socialIdentity: asFunction(
      ({ logger, fetch, config, vault, db, dbRO }: AppSingletonCradle) =>
        new SocialIdentityService(
          logger,
          fetch,
          config.urls,
          config.socialIdentity,
          config.insecureOptions,
          vault,
          db,
          dbRO,
        ),
    ),
    mastodonIdentity: asFunction(
      ({ logger, fetch, config, vault, db, dbRO }: AppSingletonCradle) =>
        new MastodonIdentityService(
          logger,
          fetch,
          config.urls,
          config.mastodonIdentity,
          vault,
          db,
          dbRO,
        ),
    ),

    atprotoOAuthClient: asFunction(
      ({ logger, fetch, config, vault, redis, db, dbRO }: AppSingletonCradle) =>
        createATProtoClient(
          logger,
          fetch,
          config.atprotoIdentity,
          config.urls,
          redis,
          vault,
          db,
        ),
    ).singleton(),

    atprotoIdentity: asFunction(
      ({
        logger,
        atprotoOAuthClient,
        config,
        vault,
        db,
        dbRO,
      }: AppSingletonCradle) =>
        new ATProtoIdentityService(
          logger,
          atprotoOAuthClient,
          config.atprotoIdentity,
          config.urls,
          vault,
          db,
          dbRO,
        ),
    ),
    webIdentity: asFunction(
      ({ logger, fetch, config, db, dbRO }: AppSingletonCradle) =>
        new WebIdentityService(logger, fetch, config.urls, db, dbRO),
    ),

    contentBlocks: asFunction(
      ({ logger, db, dbRO }: AppSingletonCradle) =>
        new ContentBlocksService(logger, db, dbRO),
    ),

    images: asFunction(
      ({
        logger,
        config,
        db,
        dbRO,
        temporalDispatch,
        s3,
        vault,
      }: AppSingletonCradle) =>
        new ImagesService(
          logger,
          config.urls,
          db,
          dbRO,
          temporalDispatch,
          s3,
          vault,
        ),
    ),
  });

  return container;
}
