import { type Static, Type } from "@sinclair/typebox";

import { HttpConfig } from "../../../_api/config/http-types.js";
import { BaseConfig } from "../../../_config/types.js";
import { PostgresConfig } from "../../../lib/datastores/postgres/config.server.js";

import { AtprotoLabelerBaseConfig } from "./consumer-types.js";

export const AtprotoLabelerConfig = Type.Intersect([
  AtprotoLabelerBaseConfig,
  Type.Object({
    signingKey: Type.String(),
    labelerName: Type.String(),
    labelPrefix: Type.String(),
  }),
]);
export type AtprotoLabelerConfig = Static<typeof AtprotoLabelerConfig>;

export const LabelerAppConfig = Type.Intersect([
  BaseConfig,
  Type.Object({
    http: HttpConfig,
    atprotoLabeler: AtprotoLabelerConfig,
    postgres: PostgresConfig,
  }),
]);
export type LabelerAppConfig = Static<typeof LabelerAppConfig>;
