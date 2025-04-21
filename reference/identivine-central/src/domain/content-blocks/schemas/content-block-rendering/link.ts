import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { UnionOneOf } from "../../../../lib/ext/typebox.js";

import { baseContentBlockRenderFields } from "./_helpers.js";

export const LinkBlockRenderSettingsV1 = schemaType(
  "LinkBlockRenderSettingsV1",
  Type.Object({
    ...baseContentBlockRenderFields("link", 1),

    title: Type.String(),
    url: Type.String(),
    icon: Type.String(),
  }),
);
export type LinkBlockRenderSettingsV1 = Static<
  typeof LinkBlockRenderSettingsV1
>;

export const LinkBlockRenderSettings = schemaType(
  "LinkBlockRenderSettings",
  UnionOneOf([LinkBlockRenderSettingsV1]),
);
export type LinkBlockRenderSettings = Static<typeof LinkBlockRenderSettings>;
