import { schemaType } from "@eropple/fastify-openapi3";
import { type Static, Type } from "@sinclair/typebox";

export const AuthTokenResponse = schemaType(
  "AuthTokenResponse",
  Type.Object({
    token: Type.String(),
    redirectTo: Type.String(),
  }),
);
export type AuthTokenResponse = Static<typeof AuthTokenResponse>;

export const InvalidateAllTokensResponse = schemaType(
  "InvalidateAllTokensResponse",
  Type.Object({
    success: Type.Boolean(),
  }),
);
export type InvalidateAllTokensResponse = Static<
  typeof InvalidateAllTokensResponse
>;
