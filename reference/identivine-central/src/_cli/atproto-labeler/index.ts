import { subcommands } from "cmd-ts";

import { labelerClearCommand } from "./clear.js";
import { labelerSetupCommand } from "./setup.js";
import { labelerStartCommand } from "./start.js";
import { labelerUpdateLabelDefinitionsCommand } from "./update-label-definitions.js";

const subs = [
  labelerStartCommand,
  labelerSetupCommand,
  labelerClearCommand,
  labelerUpdateLabelDefinitionsCommand,
].sort((a, b) => a.name.localeCompare(b.name));

export const LABELER_CLI = subcommands({
  name: "atproto-labeler",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
