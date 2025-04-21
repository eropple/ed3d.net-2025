import { command, oneOf, positional, string } from "cmd-ts";

import { labelerMain } from "../../_atproto/labeler/index.js";

export const labelerStartCommand = command({
  name: "start",
  args: {},
  handler: async (args) => {
    await labelerMain();
  },
});
