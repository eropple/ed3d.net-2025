import { type Static, Type } from "@sinclair/typebox";

import { PasetoAsymmetricKeyPair } from "../../_config/token-types.js";

export const AuthConfig = Type.Object({
  accessTokenKeyPair: PasetoAsymmetricKeyPair,
  oauth2StateKeyPair: PasetoAsymmetricKeyPair,
});
export type AuthConfig = Static<typeof AuthConfig>;

export const UsersServiceConfig = Type.Object({
  auth: AuthConfig,
});
export type UsersServiceConfig = Static<typeof UsersServiceConfig>;
