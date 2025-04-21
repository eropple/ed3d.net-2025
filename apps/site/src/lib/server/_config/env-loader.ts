import ms from "ms";
import { getBool, getNum, getStr, requireStr } from "node-getenv";

import type { RedisConfig } from "../redis/config.js";
import type { SanityConfig } from "../sanity/config.js";

import { AppConfigChecker, type AppConfig, type BaseConfig, type InsecureOptionsConfig, type UrlsConfig } from "./types/index.js";
import type { LogLevel } from "./types/log-level.js";

import type { PostgresConfig, PostgresHostConfig } from "$lib/server/db/config";
import type { MemorySWRConfig } from "$lib/server/swr/memory";
import type { TemporalConfig, TemporalQueueConfig } from "$lib/server/temporal/config";

function loadBaseConfig(): BaseConfig {
  return {
    env: getStr("NODE_ENV", "development"),
    logLevel: getStr("LOG_LEVEL", "info") as LogLevel,
    prettyLogs: getBool("PRETTY_LOGS", false),
    insecureOptions: loadInsecureOptionsConfig(),
  };
}

function loadInsecureOptionsConfig(): InsecureOptionsConfig {
  return {
    insecurelyLogOAuth2Payloads: getBool("INSECURELY_LOG_OAUTH2_PAYLOADS", false),
    allowInsecureOpenIDProviders: getBool("ALLOW_INSECURE_OPENID_PROVIDERS", false),
  };
}

function loadUrlsConfig(): UrlsConfig {
  return {
    frontendBaseUrl: requireStr("URLS__FRONTEND_BASE_URL"),
    s3BaseUrl: requireStr("URLS__S3_BASE_URL"),
    s3ExternalUrl: requireStr("URLS__S3_EXTERNAL_URL"),
  };
}

function loadMemorySWRConfig(): MemorySWRConfig {
  return {
    maxAge: getStr("MEMORY_SWR__MAX_AGE", "5m"),
    logSwrEvents: getBool("MEMORY_SWR__LOG_SWR_EVENTS", false),
  };
}

function loadPostgresHostConfig(prefix: string): PostgresHostConfig {
  return {
    host: requireStr(`${prefix}__HOST`),
    port: getNum(`${prefix}__PORT`, 5432),
    database: requireStr(`${prefix}__DATABASE`),
    user: requireStr(`${prefix}__USER`),
    password: requireStr(`${prefix}__PASSWORD`),
    ssl: getBool(`${prefix}__SSL`, false),
    logLevel: getStr(`${prefix}__LOG_LEVEL`, getStr("LOG_LEVEL", "info")) as LogLevel,
    poolSize: getNum(`${prefix}__POOL_SIZE`, 5),
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
    core: requireStr("TEMPORAL__QUEUES__CORE"),
  };
}

function loadTemporalConfig(): TemporalConfig {
  return {
    address: requireStr("TEMPORAL__ADDRESS"),
    namespace: requireStr("TEMPORAL__NAMESPACE"),
    queues: loadTemporalQueueConfig(),
  };
}

function loadSanityConfig(): SanityConfig {
  return {
    projectId: requireStr("SANITY__PROJECT_ID"),
    dataset: requireStr("SANITY__DATASET"),
    token: requireStr("SANITY__TOKEN"),
    apiVersion: getStr("SANITY__API_VERSION", "2021-03-25"),
    content: {
      contentStage: getStr("SANITY__CONTENT_STAGE", "development"),
      bypassCdnGlobal: getBool("SANITY__BYPASS_CDN_GLOBAL", false),
    },
  };
}

function loadRedisConfig(): RedisConfig {
  return {
    url: requireStr("REDIS__URL"),
  };
}

export function loadAppConfigFromNodeEnv(): AppConfig {
  const config = {
    ...loadBaseConfig(),
    urls: loadUrlsConfig(),
    redis: loadRedisConfig(),
    memorySwr: loadMemorySWRConfig(),
    postgres: loadPostgresConfig(),
    temporal: loadTemporalConfig(),
    sanity: loadSanityConfig(),
  };

  AppConfigChecker.Decode(config);
  return config;
}
