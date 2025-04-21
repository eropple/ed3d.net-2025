import { type Static, Type } from "@sinclair/typebox";

import { PasetoLocalKeyPair } from "../../_config/token-types.js";

export const SocialOAuth2ProviderCredentials = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
});
export type SocialOAuth2ProviderCredentials = Static<
  typeof SocialOAuth2ProviderCredentials
>;

export const SocialIdentityConfig = Type.Object({
  stateKeyPair: PasetoLocalKeyPair,
  providers: Type.Object({
    github: SocialOAuth2ProviderCredentials,
    gitlab: SocialOAuth2ProviderCredentials,
    threads: SocialOAuth2ProviderCredentials,
    tiktok: SocialOAuth2ProviderCredentials,
    youtube: SocialOAuth2ProviderCredentials,
    twitch: SocialOAuth2ProviderCredentials,
  }),
});
export type SocialIdentityConfig = Static<typeof SocialIdentityConfig>;
