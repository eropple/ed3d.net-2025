import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const SocialIdentityProviderConfig = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
});

export type SocialIdentityProviderConfig = Static<typeof SocialIdentityProviderConfig>;

export const SocialIdentityConfig = Type.Object({
  providers: Type.Object({
    github: SocialIdentityProviderConfig,
    google: SocialIdentityProviderConfig,
  }),
});

export type SocialIdentityConfig = Static<typeof SocialIdentityConfig>;
export const SocialIdentityConfigChecker = TypeCompiler.Compile(SocialIdentityConfig);