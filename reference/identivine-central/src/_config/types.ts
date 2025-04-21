import { LogLevel } from "@myapp/shared-universal/config/types.js";
import { TemporalConfig } from "@myapp/temporal-client/config.js";
import { type Static, Type } from "@sinclair/typebox";

import { AtprotoLabelerConsumerConfig } from "../_atproto/labeler/config/consumer-types.js";
import { ATProtoIdentityConfig } from "../domain/atproto/config.js";
import { EmailDeliveryConfig } from "../domain/email-delivery/config.js";
import { MastodonIdentityConfig } from "../domain/mastodon/config.js";
import { S3Config } from "../domain/object-store/config.js";
import { SitesServiceConfig } from "../domain/sites/config.js";
import { SocialIdentityConfig } from "../domain/social-identity/config.js";
import { UsersServiceConfig } from "../domain/users/config.js";
import { VaultConfig } from "../domain/vault/config.js";
import { MemorySWRConfig } from "../lib/datastores/memory-swr.js";
import { PostgresConfig } from "../lib/datastores/postgres/config.server.js";

export { LogLevel };

export const UrlsConfig = Type.Object({
  apiBaseUrl: Type.String({ format: "uri" }),
  panelBaseUrl: Type.String({ format: "uri" }),
  s3BaseUrl: Type.String({ format: "uri" }),
  s3ExternalUrl: Type.String({ format: "uri" }),
});
export type UrlsConfig = Static<typeof UrlsConfig>;

export const RedisConfig = Type.Object({
  url: Type.String(),
  logSwrEvents: Type.Boolean(),
});
export type RedisConfig = Static<typeof RedisConfig>;

export const InsecureOptionsConfig = Type.Object({
  skipPasswordStrengthCheck: Type.Boolean(),
  insecurelyLogOAuth2Payloads: Type.Boolean(),
});
export type InsecureOptionsConfig = Static<typeof InsecureOptionsConfig>;

export const BaseConfig = Type.Object({
  env: Type.String(),
  logLevel: LogLevel,
  prettyLogs: Type.Boolean(),

  insecureOptions: InsecureOptionsConfig,
});
export type BaseConfig = Static<typeof BaseConfig>;

export const AppConfig = Type.Intersect([
  BaseConfig,
  Type.Object({
    urls: UrlsConfig,

    redis: RedisConfig,
    memorySwr: MemorySWRConfig,
    temporal: TemporalConfig,
    emailDelivery: EmailDeliveryConfig,
    s3: S3Config,
    postgres: PostgresConfig,
    vault: VaultConfig,

    users: UsersServiceConfig,
    socialIdentity: SocialIdentityConfig,
    mastodonIdentity: MastodonIdentityConfig,
    atprotoIdentity: ATProtoIdentityConfig,
    sites: SitesServiceConfig,
    atprotoLabelerConsumer: AtprotoLabelerConsumerConfig,
  }),
]);
export type AppConfig = Static<typeof AppConfig>;
