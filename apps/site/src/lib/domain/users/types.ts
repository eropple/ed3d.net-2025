import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { UserIds } from "./ids.js";

/**
 * Public user information - safe to expose to any user
 */
export const UserPublic = Type.Object({
  __type: Type.Literal("UserPublic"),
  userId: UserIds.TRichId,
  username: Type.String(),
  avatarUrl: Type.Optional(Type.String({ format: "url" })),
});

export type UserPublic = Static<typeof UserPublic>;
export const UserPublicChecker = TypeCompiler.Compile(UserPublic);

export const SiteGrants = Type.Object({
  __type: Type.Literal("SiteGrants"),

  isStaff: Type.Boolean(),

  comments: Type.Object({
    post: Type.Boolean(),
    moderate: Type.Boolean(),
  }),
});

export type SiteGrants = Static<typeof SiteGrants>;
export const SiteGrantsChecker = TypeCompiler.Compile(SiteGrants);



/**
 * Private user information - should only be used internally or for the user themselves
 */
export const UserPrivate = Type.Composite([
  Type.Omit(UserPublic, ["__type"]),
  Type.Object({
    __type: Type.Literal("UserPrivate"),
    email: Type.String({ format: "email" }),
    emailVerified: Type.Boolean(),

    grants: SiteGrants,

    createdAt: Type.Number(),
    disabledAt: Type.Optional(Type.Number()),
  })
]);

export type UserPrivate = Static<typeof UserPrivate>;
export const UserPrivateChecker = TypeCompiler.Compile(UserPrivate);
