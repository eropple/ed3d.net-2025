import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { UnionOneOf } from "../../../../lib/ext/typebox.js";

import { LinkBlockRenderSettings } from "./link.js";

export * from "./link.js";

export const ContentBlockRenderSettings = schemaType(
  "ContentBlockRenderSettings",
  UnionOneOf([LinkBlockRenderSettings]),
);
export type ContentBlockRenderSettings = Static<
  typeof ContentBlockRenderSettings
>;
