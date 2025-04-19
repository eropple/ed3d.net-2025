import { createRichIdUtils, type RichId } from "../../utils/rich-id.js";

export type UserSessionId = RichId<"session">;
export const UserSessionIds = createRichIdUtils("session");
