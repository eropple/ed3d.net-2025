import { subcommands } from "cmd-ts";

import { jetstreamerStartCommand } from "./start.js";

const subs = [jetstreamerStartCommand].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const JETSTREAMER_CLI = subcommands({
  name: "jetstreamer",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
