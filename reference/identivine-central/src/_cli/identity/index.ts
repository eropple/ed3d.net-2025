import { subcommands } from "cmd-ts";

import { verifyAtprotoCommand } from "./verify-atproto.js";
import { verifyMastodonCommand } from "./verify-mastodon.js";
import { verifySocialCommand } from "./verify-social.js";
import { verifyWebCommand } from "./verify-web.js";

const subs = [
  verifyWebCommand,
  verifyAtprotoCommand,
  verifyMastodonCommand,
  verifySocialCommand,
].sort((a, b) => a.name.localeCompare(b.name));

export const IDENTITY_CLI = subcommands({
  name: "identity",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
