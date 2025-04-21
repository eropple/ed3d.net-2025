/* eslint-disable no-restricted-globals */
import { command, flag, oneOf, positional, string } from "cmd-ts";
import prompt from "prompts";

import { deleteLabelerDeclaration } from "../../_atproto/labeler/utils/declare-labeler.js";
import {
  plcClearLabeler,
  plcRequestToken,
} from "../../_atproto/labeler/utils/plc-setup.js";

import { promptCredentials } from "./_helpers.js";

export const labelerClearCommand = command({
  name: "clear",
  args: {
    yesIAmReallySure: flag({
      long: "yes-i-am-really-sure",
      description: "Confirm that you really want to clear the labeler.",
    }),
  },
  handler: async (args) => {
    if (process.env.NODE_ENV === "production" || !args.yesIAmReallySure) {
      console.log(
        "This command is only available in production and when passing --yes-i-am-really-sure.",
      );
      process.exit(1);
    }

    const credentials = await promptCredentials();

    await plcRequestToken(credentials);

    const { plcToken } = await prompt(
      {
        type: "text",
        name: "plcToken",
        message: "You will receive a confirmation code via email. Code:",
      },
      { onCancel: () => process.exit(1) },
    );

    await plcClearLabeler({ ...credentials, plcToken });
    await deleteLabelerDeclaration(credentials);

    console.log("Labeler data cleared.");
  },
});
