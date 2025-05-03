import { subcommands } from "cmd-ts";

import { workerListSchedulesCommand } from "./list-schedules.js";
import { workerStartCommand } from "./start.js";

const subs = [
  workerStartCommand,
  workerListSchedulesCommand,
].sort((a, b) => a.name.localeCompare(b.name));

export const WORKER_CLI = subcommands({
  name: "worker",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
