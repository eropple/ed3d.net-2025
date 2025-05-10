import { Type, type Static } from "@sinclair/typebox";
import type { Node } from "prosemirror-model";

import { TIPTAP_PRESET_KINDS } from "../../shared/tiptap-presets.js";

import { TextIds, TextRevisionIds } from "./ids.js";

const tipTapPresetKindLiterals = Type.Union(TIPTAP_PRESET_KINDS.map(kind => Type.Literal(kind)));

export const TextContentType = Type.Object({
  __type: Type.Literal("TextContent"),
  textId: TextIds.TRichId,
  revisionId: TextRevisionIds.TRichId,
  kind: tipTapPresetKindLiterals,
  contentJson: Type.Unsafe<Node>(Type.Object({}, { additionalProperties: true })),
  createdAt: Type.Date(),
});
export type TextContentType = Static<typeof TextContentType>;
