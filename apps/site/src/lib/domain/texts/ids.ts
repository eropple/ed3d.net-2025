import { type RichId, createRichIdUtils } from "../utils/rich-id.js";

export type TextId = RichId<"text">;
export const TextIds = createRichIdUtils("text");

export type TextRevisionId = RichId<"textRevision">;
export const TextRevisionIds = createRichIdUtils("textRevision");