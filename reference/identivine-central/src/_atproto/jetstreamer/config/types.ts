import { TemporalConfig } from "@myapp/temporal-client/config.js";
import { type Static, Type } from "@sinclair/typebox";

import { HttpConfig } from "../../../_api/config/http-types.js";
import { BaseConfig } from "../../../_config/types.js";
import {
  PostgresConfig,
  PostgresHostConfig,
} from "../../../lib/datastores/postgres/config.server.js";
import { StringEnum } from "../../../lib/ext/typebox.js";

export const WANTED_COLLECTIONS_ALL = [
  "app.bsky.feed.post",
  "app.bsky.actor.profile",
  //
] as const;

export const WantedCollection = StringEnum([...WANTED_COLLECTIONS_ALL]);
export type WantedCollection = Static<typeof WantedCollection>;

export const JetstreamerConfig = Type.Object({
  collections: Type.Array(WantedCollection),
  cursorCommitFrequencyMs: Type.Integer(),
  shutdownWaitMs: Type.Integer(),
});
export type JetstreamerConfig = Static<typeof JetstreamerConfig>;

export const JetstreamerAppConfig = Type.Intersect([
  BaseConfig,
  Type.Object({
    jetstreamer: JetstreamerConfig,
    temporal: TemporalConfig,
    postgres: PostgresConfig,
  }),
]);
export type JetstreamerAppConfig = Static<typeof JetstreamerAppConfig>;
