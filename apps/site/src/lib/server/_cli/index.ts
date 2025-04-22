import { subcommands } from "cmd-ts";

import { DB_CLI } from "./db/index.js";
import { SEED_CLI } from "./seed/index.js";
import { UTILS_CLI } from "./utils/index.js";

const subs = [
  SEED_CLI,
  DB_CLI,
  UTILS_CLI
].sort((a, b) => a.name.localeCompare(b.name));

export const ROOT_CLI = subcommands({
  name: "app-cli",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
