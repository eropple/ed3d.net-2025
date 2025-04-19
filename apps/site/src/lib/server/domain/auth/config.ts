import { Type, type Static } from "@sinclair/typebox";

export const SessionConfig = Type.Object({
  cookieName: Type.String(),
  cookieDomain: Type.String(),
  cookieSecure: Type.Boolean({ default: true }),
  cookieSameSite: Type.Union([
    Type.Literal("strict"),
    Type.Literal("lax"),
    Type.Literal("none")
  ]),

  maxAgeMs: Type.Number()
});

export type SessionConfig = Static<typeof SessionConfig>;

export const AuthConfig = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
  oidcUrl: Type.String({ format: "url" }),

  session: SessionConfig,
});

export type AuthConfig = Static<typeof AuthConfig>;
