/* eslint-disable no-restricted-globals */
import { LogLevelChecker } from "@myapp/shared-universal/config/types.js";
import { AJV } from "@myapp/shared-universal/utils/ajv.js";
import { EnsureTypeCheck } from "@myapp/shared-universal/utils/type-utils.js";

import { type AtprotoLabelerConsumerConfig } from "../_atproto/labeler/config/consumer-types.js";
import { S3FlavorChecker } from "../domain/object-store/config.js";

import {
  getBool,
  getNodeEnv,
  getNum,
  getStr,
  requireJson,
  requireMilliseconds,
  requireStr,
  requireStrList,
} from "./env-prefix.js";
import { AppConfig, type BaseConfig } from "./types.js";

export function loadBaseConfigFromEnv(): BaseConfig {
  return {
    env: getNodeEnv(),
    logLevel: EnsureTypeCheck(getStr("LOG_LEVEL", "info"), LogLevelChecker),
    prettyLogs: getBool("PRETTY_LOGS", false),

    ...loadInsecureOptionsConfigFromEnv(),
  };
}

function loadUrlsConfigFromEnv() {
  return {
    urls: {
      apiBaseUrl: requireStr("URLS__API_BASE_URL"),
      panelBaseUrl: requireStr("URLS__PANEL_BASE_URL"),
      s3BaseUrl: requireStr("URLS__S3_BASE_URL"),
      s3ExternalUrl: requireStr("URLS__S3_EXTERNAL_URL"),
    },
  };
}

function loadMemorySwrConfigFromEnv() {
  return {
    memorySwr: {
      maxAge: getStr("MEMORY_SWR__MAX_AGE", "3h"),
      logSwrEvents: getBool("MEMORY_SWR__LOG_SWR_EVENTS", false),
    },
  };
}

export function loadRedisConfigFromEnv() {
  return {
    redis: {
      url: requireStr("REDIS__URL"),
      logSwrEvents: getBool("REDIS__LOG_SWR_EVENTS", false),
    },
  };
}

export function loadTemporalConfigFromEnv() {
  return {
    temporal: {
      address: requireStr("TEMPORAL__ADDRESS"),
      queues: {
        core: requireStr("TEMPORAL__QUEUES__CORE"),
        identity: requireStr("TEMPORAL__QUEUES__IDENTITY"),
        media: requireStr("TEMPORAL__QUEUES__MEDIA"),
        atproto: requireStr("TEMPORAL__QUEUES__ATPROTO"),
      },
      namespace: getStr("TEMPORAL__NAMESPACE", "default"),
    },
  };
}

export function loadPostgresPoolConfigFromEnv(prefix: string) {
  return {
    host: requireStr(`${prefix}__HOST`),
    port: getNum(`${prefix}__PORT`, 5432),
    database: requireStr(`${prefix}__DATABASE`),
    user: requireStr(`${prefix}__USER`),
    password: requireStr(`${prefix}__PASSWORD`),
    ssl: getBool(`${prefix}__SSL`, false),
    poolSize: getNum(`${prefix}__POOL_SIZE`, 5),
    logLevel: EnsureTypeCheck(
      getStr(`${prefix}__LOG_LEVEL`, "info"),
      LogLevelChecker,
    ),
  };
}

export function loadPostgresConfigFromEnv() {
  return {
    postgres: {
      readonly: loadPostgresPoolConfigFromEnv("POSTGRES__READONLY"),
      readwrite: loadPostgresPoolConfigFromEnv("POSTGRES__READWRITE"),
    },
  };
}

function loadVaultConfigFromEnv() {
  return {
    vault: {
      primaryKey: requireStr("VAULT__PRIMARY_KEY"),
      legacyKeys: requireStrList("VAULT__LEGACY_KEYS", ",", true),
    },
  };
}

function loadS3ConfigFromEnv() {
  return {
    s3: {
      flavor: EnsureTypeCheck(requireStr("S3__FLAVOR"), S3FlavorChecker),
      endpoint: requireStr("S3__ENDPOINT"),
      port: getNum("S3__PORT", 443),
      ssl: getBool("S3__SSL", true),
      accessKey: requireStr("S3__ACCESS_KEY"),
      secretKey: requireStr("S3__SECRET_KEY"),
      buckets: {
        core: requireStr("S3__BUCKETS__CORE"),
        "user-public-content": requireStr("S3__BUCKETS__USER_PUBLIC_CONTENT"),
        "user-signed-access": requireStr("S3__BUCKETS__USER_SIGNED_ACCESS"),
        "upload-staging": requireStr("S3__BUCKETS__UPLOAD_STAGING"),
      },
    },
  };
}

function loadUsersConfigFromEnv() {
  return {
    users: {
      auth: {
        accessTokenKeyPair: {
          type: "paseto-v4-private" as const,
          publicKey: requireStr(
            "USERS__AUTH__ACCESS_TOKEN_KEY_PAIR__PUBLIC_KEY",
          ),
          secretKey: requireStr(
            "USERS__AUTH__ACCESS_TOKEN_KEY_PAIR__SECRET_KEY",
          ),
        },
        oauth2StateKeyPair: {
          type: "paseto-v4-private" as const,
          publicKey: requireStr(
            "USERS__AUTH__OAUTH2_STATE_KEY_PAIR__PUBLIC_KEY",
          ),
          secretKey: requireStr(
            "USERS__AUTH__OAUTH2_STATE_KEY_PAIR__SECRET_KEY",
          ),
        },
      },
    },
  };
}

function loadSocialIdentityConfigFromEnv() {
  return {
    socialIdentity: {
      stateKeyPair: {
        type: "paseto-v4-local" as const,
        key: requireStr("SOCIAL_IDENTITY__STATE_KEY_PAIR__KEY"),
      },
      providers: {
        github: {
          clientId: requireStr("SOCIAL_IDENTITY__PROVIDERS__GITHUB__CLIENT_ID"),
          clientSecret: requireStr(
            "SOCIAL_IDENTITY__PROVIDERS__GITHUB__CLIENT_SECRET",
          ),
        },
        gitlab: {
          clientId: requireStr("SOCIAL_IDENTITY__PROVIDERS__GITLAB__CLIENT_ID"),
          clientSecret: requireStr(
            "SOCIAL_IDENTITY__PROVIDERS__GITLAB__CLIENT_SECRET",
          ),
        },
        threads: {
          clientId: requireStr(
            "SOCIAL_IDENTITY__PROVIDERS__THREADS__CLIENT_ID",
          ),
          clientSecret: requireStr(
            "SOCIAL_IDENTITY__PROVIDERS__THREADS__CLIENT_SECRET",
          ),
        },
        tiktok: {
          clientId: requireStr("SOCIAL_IDENTITY__PROVIDERS__TIKTOK__CLIENT_ID"),
          clientSecret: requireStr(
            "SOCIAL_IDENTITY__PROVIDERS__TIKTOK__CLIENT_SECRET",
          ),
        },
        youtube: {
          clientId: requireStr("SOCIAL_IDENTITY__PROVIDERS__GOOGLE__CLIENT_ID"),
          clientSecret: requireStr(
            "SOCIAL_IDENTITY__PROVIDERS__GOOGLE__CLIENT_SECRET",
          ),
        },
        twitch: {
          clientId: requireStr("SOCIAL_IDENTITY__PROVIDERS__TWITCH__CLIENT_ID"),
          clientSecret: requireStr(
            "SOCIAL_IDENTITY__PROVIDERS__TWITCH__CLIENT_SECRET",
          ),
        },
      },
    },
  };
}

function loadMastodonConfigFromEnv() {
  return {
    mastodonIdentity: {
      stateKeyPair: {
        type: "paseto-v4-local" as const,
        key: requireStr("MASTODON__STATE_KEY_PAIR__KEY"),
      },
      appName: requireStr("MASTODON__APP_NAME"),
    },
  };
}

function loadAtprotoIdentityConfigFromEnv() {
  return {
    atprotoIdentity: {
      clientName: requireStr("ATPROTO__CLIENT_NAME"),
      serviceUrl: getStr("ATPROTO__SERVICE_URL", "https://bsky.social"),
      currentKid: requireStr("ATPROTO__CURRENT_KID"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jwks: requireJson("ATPROTO__JWKS") as any,
      stateKeyPair: {
        type: "paseto-v4-local" as const,
        key: requireStr("ATPROTO__STATE_KEY_PAIR__KEY"),
      },
    },
  };
}

function loadAtprotoLabelerConsumerConfigFromEnv(): {
  atprotoLabelerConsumer: AtprotoLabelerConsumerConfig;
} {
  return {
    atprotoLabelerConsumer: {
      did: requireStr("ATPROTO_LABELER_CONSUMER__DID"),
      domain: requireStr("ATPROTO_LABELER_CONSUMER__DOMAIN"),
      preSharedKey: requireStr("ATPROTO_LABELER_CONSUMER__PRE_SHARED_KEY"),
    },
  };
}

function loadSitesConfigFromEnv() {
  return {
    sites: {
      publicSiteCacheTTLMs: requireMilliseconds("SITES__PUBLIC_SITE_CACHE_TTL"),
      publicSiteStaleTimeMs: requireMilliseconds(
        "SITES__PUBLIC_SITE_STALE_TIME",
      ),
    },
  };
}

export function loadInsecureOptionsConfigFromEnv() {
  return {
    insecureOptions: {
      skipPasswordStrengthCheck: getBool(
        "INSECURE_OPTIONS__SKIP_PASSWORD_STRENGTH_CHECK",
        false,
      ),
      insecurelyLogOAuth2Payloads: getBool(
        "INSECURE_OPTIONS__INSECURELY_LOG_OAUTH2_PAYLOADS",
        false,
      ),
    },
  };
}

export function normalAppConfig(): AppConfig {
  return {
    ...loadBaseConfigFromEnv(),
    ...loadUrlsConfigFromEnv(),
    ...loadMemorySwrConfigFromEnv(),
    ...loadRedisConfigFromEnv(),
    ...loadTemporalConfigFromEnv(),
    ...loadPostgresConfigFromEnv(),
    ...loadVaultConfigFromEnv(),
    ...loadS3ConfigFromEnv(),
    ...loadUsersConfigFromEnv(),
    ...loadSocialIdentityConfigFromEnv(),
    ...loadMastodonConfigFromEnv(),
    ...loadAtprotoIdentityConfigFromEnv(),
    ...loadAtprotoLabelerConsumerConfigFromEnv(),
    ...loadSitesConfigFromEnv(),
    emailDelivery: {},
  };
}

export function loadAppConfigFromEnvNode(): AppConfig {
  const ret = normalAppConfig();
  if (!["development", "test"].includes(ret.env!)) {
    const insecureEntries = Object.entries(ret.insecureOptions!);

    if (insecureEntries.some(([k, v]) => v)) {
      console.error(`!!! Insecure options are enabled in ${ret.env} mode.`);
      console.error(`!!! The following insecure options are enabled:`);
      for (const [k, v] of insecureEntries) {
        if (v) {
          console.error(`  - ${k}`);
        }
      }
      throw new Error("Insecure options are enabled in production mode.");
    }
  }

  const validate = AJV.compile(AppConfig);
  if (validate(ret)) {
    return ret as AppConfig;
  } else {
    console.error(validate.errors);
    throw new Error("Bad startup config.");
  }
}
