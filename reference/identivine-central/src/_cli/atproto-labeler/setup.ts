/* eslint-disable no-restricted-globals */
import { command, flag, oneOf, positional, string } from "cmd-ts";
import prompt, { type PromptType } from "prompts";

import {
  plcRequestToken,
  plcSetupLabeler,
} from "../../_atproto/labeler/utils/plc-setup.js";

import { promptCredentials } from "./_helpers.js";

export const labelerSetupCommand = command({
  name: "setup",
  args: {
    generateNewPrivateKey: flag({
      long: "generate-new-private-key",
      description: "Generate a new signing key as part of the labeler setup.",
    }),
  },
  handler: async (args) => {
    console.log("Prompting for credentials...");
    const credentials = await promptCredentials();

    console.log("Requesting a token from the PLC...");
    await plcRequestToken(credentials);

    const { plcToken } = await prompt(
      {
        type: "text",
        name: "plcToken",
        message: "You will receive a confirmation code via email. Code:",
      },
      { onCancel: () => process.exit(1) },
    );

    const questions = [
      {
        type: "text" as PromptType,
        name: "endpoint",
        message: "URL where the labeler will be hosted:",
        validate: (value: string) =>
          value.startsWith("https://") ||
          ("Must be a valid HTTPS URL." as string),
      },
    ];

    if (!args.generateNewPrivateKey) {
      questions.push({
        type: "text",
        name: "privateKey",
        message: "Enter a signing key to use",

        validate: (value: string) => {
          if (/^[0-9a-f]*$/.test(value)) return true;
          if (/^[A-Za-z0-9+/=]+$/.test(value)) return true;
          return "Must be a hex or base64-encoded string.";
        },
      } as const);
    }

    const { endpoint, privateKey } = await prompt(questions, {
      onCancel: () => process.exit(1),
    });

    const operation = await plcSetupLabeler({
      ...credentials,
      plcToken,
      endpoint,
      privateKey,
      overwriteExistingKey: args.generateNewPrivateKey,
    });

    console.log("You will need the private key from the last step");
  },
});
