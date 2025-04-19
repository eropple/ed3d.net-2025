import { Optional, Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

/**
 * The identity data from the OIDC provider (mostly optional as it can't be required)
 */
export const RawOIDCIdentity = Type.Intersect([
  Type.Object({
    sub: Type.String(),
    name: Type.Optional(Type.String()),
    given_name: Type.Optional(Type.String()),
    family_name: Type.Optional(Type.String()),
    middle_name: Type.Optional(Type.String()),
    nickname: Type.Optional(Type.String()),
    preferred_username: Type.String(),
    email: Type.String(),
    email_verified: Type.Boolean(),
    picture: Type.Optional(Type.String()),
    locale: Type.Optional(Type.String()),
    ed3dsite: Type.Optional(Type.Object({
      is_staff: Type.Optional(Type.Boolean()),
      is_admin: Type.Optional(Type.Boolean()),

      comments: Type.Optional(Type.Object({
        moderate: Type.Optional(Type.Boolean()),
        no_post: Type.Optional(Type.Boolean()),
      })),
    }))
  }),
  Type.Record(Type.String(), Type.Any()),
]);

export type RawOIDCIdentity = Static<typeof RawOIDCIdentity>;
export const RawOIDCIdentityChecker = TypeCompiler.Compile(RawOIDCIdentity);

