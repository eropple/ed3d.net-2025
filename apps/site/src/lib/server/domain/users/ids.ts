import { createRichIdUtils, type RichId } from "../../utils/rich-id.js";

export type UserId = RichId<"user">;
export const UserIds = createRichIdUtils("user");
