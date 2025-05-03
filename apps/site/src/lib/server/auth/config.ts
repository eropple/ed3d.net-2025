// src/lib/server/auth/config.ts
import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { ATProtoConfig } from "./atproto/config.js";
import { SocialIdentityConfig } from "./social-identity/config.js";

export const AuthConfig = Type.Object({
  // Social identity configuration (GitHub, Google, etc.)
  socialIdentity: SocialIdentityConfig,

  // ATProto (Bluesky) configuration
  atproto: ATProtoConfig,

  // Session configuration
  session: Type.Object({
    // Default time that sessions will last (e.g. "30d" for 30 days)
    defaultDuration: Type.String({ default: "30d" }),
    // Cookie name for the session
    cookieName: Type.String({ default: "ed3d_session" }),
    // Whether to secure cookies (should be true in production)
    secureCookies: Type.Boolean(),
    // Domain for cookies
    cookieDomain: Type.Optional(Type.String()),
  }),

  // Magic Link configuration
  magicLink: Type.Object({
    expirationTime: Type.String({ default: "15m" }),
  }),
});

export type AuthConfig = Static<typeof AuthConfig>;
export const AuthConfigChecker = TypeCompiler.Compile(AuthConfig);