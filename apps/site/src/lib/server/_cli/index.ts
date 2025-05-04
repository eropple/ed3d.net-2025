import { subcommands } from "cmd-ts";

import { DB_CLI } from "./db/index.js";
import { SEED_CLI } from "./seed/index.js";
import { SOCIAL_CLI } from "./social/index.js";
import { UTILS_CLI } from "./utils/index.js";
import { WORKER_CLI } from "./worker/index.js";

const subs = [
  SEED_CLI,
  DB_CLI,
  UTILS_CLI,
  WORKER_CLI,
  SOCIAL_CLI,
].sort((a, b) => a.name.localeCompare(b.name));

export const ROOT_CLI = subcommands({
  name: "app-cli",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
