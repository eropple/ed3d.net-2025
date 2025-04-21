import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import {
  type DBUser,
  type DBUserEmailVerificationToken,
} from "../../_db/models.js";

export const AuthTokenPayload = schemaType(
  "AuthTokenPayload",
  Type.Object({
    userId: Type.String(),
    salt: Type.Integer(),
  }),
);
export type AuthTokenPayload = Static<typeof AuthTokenPayload>;
export const AuthTokenPayloadChecker = TypeCompiler.Compile(AuthTokenPayload);

export const CredentialLoginRequest = schemaType(
  "CredentialLoginRequest",
  Type.Object({
    email: Type.String(),
    passwordCleartext: Type.String(),
    redirectTo: Type.Optional(Type.String()),
  }),
);
export type CredentialLoginRequest = Static<typeof CredentialLoginRequest>;

export const CreateUserRequest = schemaType(
  "CreateUserRequest",
  Type.Object({
    email: Type.String(),
    displayName: Type.String(),
    passwordCleartext: Type.String(),
  }),
);
export type CreateUserRequest = Static<typeof CreateUserRequest>;

export type CreateUserResult = {
  user: DBUser;
  emailToken: DBUserEmailVerificationToken;
};

export const BumpTokenSaltRequest = schemaType(
  "BumpTokenSaltRequest",
  Type.Object({
    userId: Type.String(),
  }),
);
export type BumpTokenSaltRequest = Static<typeof BumpTokenSaltRequest>;

export const ChangePasswordRequest = schemaType(
  "ChangePasswordRequest",
  Type.Object({
    currentPassword: Type.String(),
    newPassword: Type.String(),
  }),
);
export type ChangePasswordRequest = Static<typeof ChangePasswordRequest>;
