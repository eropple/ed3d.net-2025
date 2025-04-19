import ms from "ms";

import type { RedisConfig } from "../redis/config.js";

import { AppConfigChecker, type AppConfig, type BaseConfig, type InsecureOptionsConfig, type UrlsConfig } from "./types/index.js";
import type { LogLevel } from "./types/log-level.js";

import { env } from "$env/dynamic/private";
import type { PostgresConfig, PostgresHostConfig } from "$lib/server/db/config";
import type { AuthConfig, SessionConfig } from "$lib/server/domain/auth/config.js";
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

function loadInsecureOptionsConfig(): InsecureOptionsConfig {
  return {
    insecurelyLogOAuth2Payloads: env.INSECURELY_LOG_OAUTH2_PAYLOADS === "true",
    allowInsecureOpenIDProviders: env.ALLOW_INSECURE_OPENID_PROVIDERS === "true",
  };
}

function loadUrlsConfig(): UrlsConfig {
  return {
    frontendBaseUrl: env.URLS__FRONTEND_BASE_URL,
    s3BaseUrl: env.URLS__S3_BASE_URL,
    s3ExternalUrl: env.URLS__S3_EXTERNAL_URL,
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

function loadSessionConfig(): SessionConfig {
  return {
    cookieName: env.AUTH__SESSION__COOKIE_NAME!,
    cookieDomain: env.AUTH__SESSION__COOKIE_DOMAIN!,
    cookieSecure: env.AUTH__SESSION__COOKIE_SECURE === "true" || env.AUTH__SESSION__COOKIE_SECURE === "1",
    cookieSameSite: env.AUTH__SESSION__COOKIE_SAMESITE as "strict" | "lax" | "none",
    maxAgeMs: ms(env.AUTH__SESSION__MAX_AGE_MS ?? "30d"),
  };
}

function loadAuthConfig(): AuthConfig {
  return {
    clientId: env.AUTH__CLIENT_ID,
    clientSecret: env.AUTH__CLIENT_SECRET,
    oidcUrl: env.AUTH__OIDC_URL,
    session: loadSessionConfig(),
  };
}

function loadRedisConfig(): RedisConfig {
  return {
    url: env.REDIS__URL,
  };
}

export function loadAppConfigFromSvelteEnv(): AppConfig {
  const config = {
    ...loadBaseConfig(),
    urls: loadUrlsConfig(),
    auth: loadAuthConfig(),
    memorySwr: loadMemorySWRConfig(),
    redis: loadRedisConfig(),
    postgres: loadPostgresConfig(),
    temporal: loadTemporalConfig(),
  };

  AppConfigChecker.Decode(config);
  return config;
}
