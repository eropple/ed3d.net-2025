// apps/site/src/lib/server/_cli/vault/create-vault-key.ts
import { command } from "cmd-ts";

import { generateVaultKey } from "../../vault/helpers.js";

export const createVaultKeyCommand = command({
  name: "create-vault-key",
  description: "Generates a new vault key for encrypting sensitive data",
  args: {},
  handler: async () => {
    const key = generateVaultKey();
    process.stdout.write(key + "\n");
  },
});