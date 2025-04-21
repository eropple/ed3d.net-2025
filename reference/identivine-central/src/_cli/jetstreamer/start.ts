import { command, oneOf, positional, string } from "cmd-ts";

import { jetstreamerMain } from "../../_atproto/jetstreamer/index.js";

export const jetstreamerStartCommand = command({
  name: "start",
  args: {},
  handler: async (args) => {
    await jetstreamerMain();
  },
});
