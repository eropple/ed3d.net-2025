import { type Static, Type } from "@sinclair/typebox";

import { PasetoLocalKeyPair } from "../../_config/token-types.js";

export const MastodonIdentityConfig = Type.Object({
  stateKeyPair: PasetoLocalKeyPair,
  appName: Type.String(),
});
export type MastodonIdentityConfig = Static<typeof MastodonIdentityConfig>;
