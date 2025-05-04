import { subcommands } from "cmd-ts";

import { refreshDiscordTokensCommand } from "./refresh-discord-tokens.js";
import { refreshGitHubTokensCommand } from "./refresh-github-tokens.js";
import { refreshGoogleTokensCommand } from "./refresh-google-tokens.js";

const subs = [
  refreshDiscordTokensCommand,
  refreshGitHubTokensCommand,
  refreshGoogleTokensCommand,
].sort((a, b) => a.name.localeCompare(b.name));

export const SOCIAL_CLI = subcommands({
  name: "social",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
