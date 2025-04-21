import { XRPCError } from "@atcute/client";
import prompt from "prompts";

import { resolveHandle } from "../../_atproto/labeler/utils/handle-resolution.js";
import {
  loginAgent,
  type LoginCredentials,
} from "../../_atproto/labeler/utils/login.js";

export async function promptCredentials(
  did?: string,
): Promise<LoginCredentials> {
  if (!did) {
    const { did: didOrHandle } = await prompt(
      {
        type: "text",
        name: "did",
        message: "DID or handle of the account to use:",
        validate: (value) =>
          value.startsWith("did:") ||
          value.includes(".") ||
          "Invalid DID or handle.",
        format: (value) => (value.startsWith("@") ? value.slice(1) : value),
      },
      { onCancel: () => process.exit(1) },
    );

    did = didOrHandle.startsWith("did:")
      ? didOrHandle
      : // here we don't care as this is an admin-side command
        // eslint-disable-next-line no-restricted-globals
        await resolveHandle(fetch, didOrHandle);

    if (!did) {
      throw new Error(
        `Could not resolve "${didOrHandle}" to a valid account. Please try again.`,
      );
    }
  }

  const { password, pds } = await prompt(
    [
      {
        type: "password",
        name: "password",
        message: `Account password for '${did}' (cannot be an app password):`,
      },
      {
        type: "text",
        name: "pds",
        message: `URL of the PDS where '${did}' is located:`,
        initial: "https://bsky.social",
        validate: (value) =>
          value.startsWith("https://") || "Must be a valid HTTPS URL.",
      },
    ],
    { onCancel: () => process.exit(1) },
  );

  const credentials: LoginCredentials = { identifier: did, password, pds };

  try {
    await loginAgent(credentials);
  } catch (error) {
    if (
      error instanceof XRPCError &&
      error.kind === "AuthFactorTokenRequired"
    ) {
      const { code } = await prompt(
        {
          type: "text",
          name: "code",
          message: "You will receive a 2FA code via email. Code:",
          initial: "",
        },
        { onCancel: () => process.exit(1) },
      );
      credentials.code = code;
    } else {
      // eslint-disable-next-line no-restricted-globals
      console.error("Error occurred while trying to log in:", error);
      process.exit(1);
    }
  }
  return credentials;
}

export async function confirm(message: string) {
  let confirmed = false;
  while (!confirmed) {
    const { confirm } = await prompt({
      type: "confirm",
      name: "confirm",
      message,
    });
    confirmed = confirm;
  }
}
