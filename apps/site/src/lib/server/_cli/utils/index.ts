// apps/site/src/lib/server/_cli/vault/index.ts
import { subcommands } from "cmd-ts";

import { createVaultKeyCommand } from "./create-vault-key.js";
import { sendTestEmailCommand } from "./send-test-email.js";

const subs = [createVaultKeyCommand, sendTestEmailCommand].sort((a, b) => a.name.localeCompare(b.name));

export const UTILS_CLI = subcommands({
  name: "utils",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});