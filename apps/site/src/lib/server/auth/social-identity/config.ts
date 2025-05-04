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
    discord: SocialIdentityProviderConfig,
  }),
  discordServerId: Type.Optional(Type.String({ minLength: 1 })),
  discordInviteLink: Type.Optional(Type.String()),
});

export type SocialIdentityConfig = Static<typeof SocialIdentityConfig>;
export const SocialIdentityConfigChecker = TypeCompiler.Compile(SocialIdentityConfig);