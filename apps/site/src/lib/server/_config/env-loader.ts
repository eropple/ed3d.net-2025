import ms from "ms";
import { getBool, getNum, getStr, requireStr } from "node-getenv";

import { type ATProtoConfig } from "../auth/atproto/config.js";
import { type AuthConfig } from "../auth/config.js";
import { type PrivateJWKS } from "../auth/jwks.js";
import { type SocialIdentityConfig } from "../auth/social-identity/config.js";
import { type EmailDeliveryConfig } from "../email/config.js";
import type { RedisConfig } from "../redis/config.js";
import type { SanityConfig } from "../sanity/config.js";
import type { VaultConfig } from "../vault/config.js";

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

function loadVaultConfig(): VaultConfig {
  return {
    primaryKey: requireStr("VAULT__PRIMARY_KEY"),
    legacyKeys: getStr("VAULT__LEGACY_KEYS", "")
      .split(",")
      .filter(key => key.trim().length > 0)
  };
}

function loadSocialIdentityConfig(): SocialIdentityConfig {
  return {
    providers: {
      github: {
        clientId: requireStr("AUTH__SOCIAL_IDENTITY__PROVIDERS__GITHUB__CLIENT_ID"),
        clientSecret: requireStr("AUTH__SOCIAL_IDENTITY__PROVIDERS__GITHUB__CLIENT_SECRET"),
      },
      google: {
        clientId: requireStr("AUTH__SOCIAL_IDENTITY__PROVIDERS__GOOGLE__CLIENT_ID"),
        clientSecret: requireStr("AUTH__SOCIAL_IDENTITY__PROVIDERS__GOOGLE__CLIENT_SECRET"),
      },
    },
  };
}

function loadATProtoConfig(): ATProtoConfig {
  const privateJwksJson = requireStr("AUTH__ATPROTO__PRIVATE_JWKS");
  const privateJwks = JSON.parse(privateJwksJson) as PrivateJWKS;

  return {
    privateJwks,
    handleResolver: getStr("AUTH__ATPROTO__HANDLE_RESOLVER", "https://bsky.social/"),
  };
}

function loadAuthConfig(): AuthConfig {
  return {
    socialIdentity: loadSocialIdentityConfig(),
    atproto: loadATProtoConfig(),
    session: {
      defaultDuration: getStr("AUTH__SESSION__DEFAULT_DURATION", "30d"),
      cookieName: getStr("AUTH__SESSION__COOKIE_NAME", "ed3d_session"),
      secureCookies: getBool("AUTH__SESSION__SECURE_COOKIES", process.env.NODE_ENV === "production"),
      cookieDomain: getStr("AUTH__SESSION__COOKIE_DOMAIN", ""),
    },
    magicLink: {
      expirationTime: getStr("AUTH__MAGIC_LINK__EXPIRATION_TIME", "15m"),
    },
  };
}

function loadEmailDeliveryConfig(): EmailDeliveryConfig {
  return {
    smtp: {
      host: requireStr("EMAIL_DELIVERY__SMTP__HOST"),
      port: getNum("EMAIL_DELIVERY__SMTP__PORT", 25),
      tls: getBool("EMAIL_DELIVERY__SMTP__TLS", false),
      auth: {
        user: requireStr("EMAIL_DELIVERY__SMTP__AUTH__USER"),
        pass: requireStr("EMAIL_DELIVERY__SMTP__AUTH__PASS"),
      }
    },
    defaults: {
      from: getStr("EMAIL_DELIVERY__DEFAULTS__FROM", "ed at ed3d <ed+automailer@ed3d.net>"),
      replyTo: getStr("EMAIL_DELIVERY__DEFAULTS__REPLY_TO", "ed at ed3d <ed+automailer@ed3d.net>"),
    }
  };
}

export function loadAppConfigFromNodeEnv(): AppConfig {
  const config = {
    ...loadBaseConfig(),
    urls: loadUrlsConfig(),
    vault: loadVaultConfig(),
    redis: loadRedisConfig(),
    memorySwr: loadMemorySWRConfig(),
    postgres: loadPostgresConfig(),
    temporal: loadTemporalConfig(),
    sanity: loadSanityConfig(),
    auth: loadAuthConfig(),
    emailDelivery: loadEmailDeliveryConfig(),
  };

  AppConfigChecker.Decode(config);
  return config;
}
