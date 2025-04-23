import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { createClient, type SanityClient } from "@sanity/client";
import {
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer,
} from "awilix";
import Redis from "ioredis";
import type * as pg from "pg";
import type { Logger } from "pino";
import type { StaleWhileRevalidate } from "stale-while-revalidate-cache";
import type { DeepReadonly } from "utility-types";


import { VaultKeyStore } from "../../vault/keystore.js";
import { VaultService } from "../../vault/service.js";

import type { AppConfig } from "$lib/server/_config/types";
import { createATProtoOAuthClient } from "$lib/server/auth/atproto/client-factory.js";
import { buildDbPoolFromConfig, buildDrizzle } from "$lib/server/db/builders.js";
import type { Drizzle, DrizzleRO } from "$lib/server/db/types";
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

    vaultKeyStore: asFunction(({ config }: AppSingletonCradle) => {
      return new VaultKeyStore({
        primaryKey: config.vault.primaryKey,
        legacyKeys: [...config.vault.legacyKeys || []],
      });
    }).singleton(),

    // domain objects too expensive to build on request go here
    atprotoOAuthClient: asFunction(async ({ logger, db, vault, config }) => {
      return createATProtoOAuthClient(
        logger,
        db,
        vault,
        config.atproto
      );
    }).singleton(),

    vault: asFunction(({ vaultKeyStore }: AppSingletonCradle) => {
      return new VaultService(vaultKeyStore);
    }).singleton(),
  });

  return container;
}
