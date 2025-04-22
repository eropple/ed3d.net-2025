import ms from "ms";

import type { RedisConfig } from "../redis/config.js";
import type { SanityConfig } from "../sanity/config.js";
import type { VaultConfig } from "../vault/config.js";

import { AppConfigChecker, type AppConfig, type BaseConfig, type InsecureOptionsConfig, type UrlsConfig } from "./types/index.js";
import type { LogLevel } from "./types/log-level.js";

import { env } from "$env/dynamic/private";
import type { PostgresConfig, PostgresHostConfig } from "$lib/server/db/config";
import type { MemorySWRConfig } from "$lib/server/swr/memory";
import type { TemporalConfig, TemporalQueueConfig } from "$lib/server/temporal/config";

function loadBaseConfig(): BaseConfig {
  return {
    env: env.NODE_ENV || "development",
    logLevel: (env.LOG_LEVEL || "info") as LogLevel,
    prettyLogs: env.PRETTY_LOGS === "true",
    insecureOptions: loadInsecureOptionsConfig(),
  };
}

function loadUrlsConfig(): UrlsConfig {
  return {
    frontendBaseUrl: env.URLS__FRONTEND_BASE_URL,
    s3BaseUrl: env.URLS__S3_BASE_URL,
    s3ExternalUrl: env.URLS__S3_EXTERNAL_URL,
  };
}

function loadInsecureOptionsConfig(): InsecureOptionsConfig {
  return {
    insecurelyLogOAuth2Payloads: env.INSECURELY_LOG_OAUTH2_PAYLOADS === "true",
    allowInsecureOpenIDProviders: env.ALLOW_INSECURE_OPENID_PROVIDERS === "true",
  };
}

function loadMemorySWRConfig(): MemorySWRConfig {
  return {
    maxAge: env.MEMORY_SWR__MAX_AGE || "5m",
    logSwrEvents: env.MEMORY_SWR__LOG_SWR_EVENTS === "true",
  };
}

function loadPostgresHostConfig(prefix: string): PostgresHostConfig {
  return {
    // claiming these are not undefined is fine because we check the config at the end.
    host: env[`${prefix}__HOST`]!,
    port: parseInt(env[`${prefix}__PORT`] || "5432", 10),
    database: env[`${prefix}__DATABASE`]!,
    user: env[`${prefix}__USER`]!,
    password: env[`${prefix}__PASSWORD`]!,
    ssl: env[`${prefix}__SSL`] === "true",
    logLevel: (env[`${prefix}__LOG_LEVEL`] || env.LOG_LEVEL || "info") as LogLevel,
    poolSize: parseInt(env[`${prefix}__POOL_SIZE`] || "5", 10),
  };
}

function loadPostgresConfig(): PostgresConfig {
  return {
    readonly: loadPostgresHostConfig("POSTGRES__READONLY"),
    readwrite: loadPostgresHostConfig("POSTGRES__READWRITE"),
  };
}

function loadTemporalQueueConfig(): TemporalQueueConfig {
  return {
    core: env.TEMPORAL__QUEUES__CORE,
  };
}

function loadTemporalConfig(): TemporalConfig {
  return {
    address: env.TEMPORAL__ADDRESS,
    namespace: env.TEMPORAL__NAMESPACE,
    queues: loadTemporalQueueConfig(),
  };
}

function loadSanityConfig(): SanityConfig {
  return {
    projectId: env.SANITY__PROJECT_ID,
    dataset: env.SANITY__DATASET,
    token: env.SANITY__TOKEN,
    apiVersion: env.SANITY__API_VERSION ?? "2021-03-25",
    content: {
      contentStage: (env.SANITY__CONTENT_STAGE ?? "development") as "development" | "production",
      bypassCdnGlobal: [1, true, "true"].includes(env.SANITY__BYPASS_CDN_GLOBAL ?? false),
    },
  };
}

function loadRedisConfig(): RedisConfig {
  return {
    url: env.REDIS__URL,
  };
}

function loadVaultConfig(): VaultConfig {
  return {
    primaryKey: env.VAULT__PRIMARY_KEY!,
    legacyKeys: env.VAULT__LEGACY_KEYS
      ? env.VAULT__LEGACY_KEYS.split(",").filter(key => key.trim().length > 0)
      : undefined
  };
}

export function loadAppConfigFromSvelteEnv(): AppConfig {
  const config = {
    ...loadBaseConfig(),
    memorySwr: loadMemorySWRConfig(),
    urls: loadUrlsConfig(),
    vault: loadVaultConfig(),
    redis: loadRedisConfig(),
    postgres: loadPostgresConfig(),
    temporal: loadTemporalConfig(),
    sanity: loadSanityConfig(),
  };

  AppConfigChecker.Decode(config);
  return config;
}
