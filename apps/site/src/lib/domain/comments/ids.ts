import { type RichId, createRichIdUtils } from "../utils/rich-id.js";

export type CommentId = RichId<"comment">;
export const CommentIds = createRichIdUtils("comment");