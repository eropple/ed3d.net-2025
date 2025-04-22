import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { RedisConfig } from "../../redis/config.js";
import { SanityConfig } from "../../sanity/config";
import { TemporalConfig } from "../../temporal/config";

import { LogLevel } from "./log-level";

import { PostgresConfig } from "$lib/server/db/config";
import { MemorySWRConfig } from "$lib/server/swr/memory";

import "$lib/ext/typebox/index.js";
import { VaultConfig } from "../../vault/config.js";



export const LogLevelChecker = TypeCompiler.Compile(LogLevel);

export const UrlsConfig = Type.Object({
  frontendBaseUrl: Type.String({ format: "url" }),
  s3BaseUrl: Type.String({ format: "url" }),
  s3ExternalUrl: Type.String({ format: "url" }),
});
export type UrlsConfig = Static<typeof UrlsConfig>;

export const InsecureOptionsConfig = Type.Object({
  insecurelyLogOAuth2Payloads: Type.Boolean(),
  allowInsecureOpenIDProviders: Type.Boolean(),
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

    memorySwr: MemorySWRConfig,

    redis: RedisConfig,
    postgres: PostgresConfig,
    temporal: TemporalConfig,
    sanity: SanityConfig,
    vault: VaultConfig,
  }),
]);
export type AppConfig = Static<typeof AppConfig>;
export const AppConfigChecker = TypeCompiler.Compile(AppConfig);
