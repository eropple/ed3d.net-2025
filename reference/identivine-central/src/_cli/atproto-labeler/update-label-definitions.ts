import { command, flag, oneOf, positional, string } from "cmd-ts";

import { loadLabelerAppConfigFromEnv } from "../../_atproto/labeler/config/env-loader.js";
import { declareLabeler } from "../../_atproto/labeler/utils/declare-labeler.js";
import { getStr } from "../../_config/env-prefix.js";

import { promptCredentials } from "./_helpers.js";

export const labelerUpdateLabelDefinitionsCommand = command({
  name: "update-label-definitions",
  args: {
    overwriteExisting: flag({
      long: "overwrite-existing",
      description: "Overwrite existing label definitions.",
    }),
  },
  handler: async (args) => {
    // eslint-disable-next-line no-restricted-globals
    console.log(args);
    const config = loadLabelerAppConfigFromEnv();
    const credentials = await promptCredentials(config.atprotoLabeler.did);

    await declareLabeler(
      credentials,
      config.atprotoLabeler,
      args.overwriteExisting,
    );

    // eslint-disable-next-line no-restricted-globals
    console.log("Label definitions updated!");
  },
});
