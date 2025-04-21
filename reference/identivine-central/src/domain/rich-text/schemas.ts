import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

import { UnionOneOf } from "../../lib/ext/typebox.js";

export const RichTextTipTapV1 = schemaType(
  "RichTextTipTapV1",
  Type.Object({
    kind: Type.Literal("tt"),
    version: Type.Literal(2),
    content: Type.Object({}),
  }),
);
export type RichTextTipTapV1 = Static<typeof RichTextTipTapV1>;

export const RichText = schemaType("RichText", UnionOneOf([RichTextTipTapV1]));
export type RichText = Static<typeof RichText>;
