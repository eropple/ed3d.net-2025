import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { AuthConfig } from "../../domain/auth/config.js";
import { RedisConfig } from "../../redis/config.js";
import { TemporalConfig } from "../../temporal/config";

import { LogLevel } from "./log-level";

import { PostgresConfig } from "$lib/server/db/config";
import { MemorySWRConfig } from "$lib/server/swr/memory";

import "$lib/ext/typebox/index.js";



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
    auth: AuthConfig,

    memorySwr: MemorySWRConfig,

    redis: RedisConfig,
    postgres: PostgresConfig,
    temporal: TemporalConfig,
  }),
]);
export type AppConfig = Static<typeof AppConfig>;
export const AppConfigChecker = TypeCompiler.Compile(AppConfig);
