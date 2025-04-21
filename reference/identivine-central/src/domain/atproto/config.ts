import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { PasetoLocalKeyPair } from "../../_config/token-types.js";

export const ATProtoJWKS = Type.Object({
  keys: Type.Array(
    Type.Object({
      kty: Type.Literal("EC"),
      crv: Type.Literal("P-256"),
      kid: Type.String(),
      x: Type.String(),
      y: Type.String(),
      d: Type.String(),
    }),
  ),
});
export type ATProtoJWKS = Static<typeof ATProtoJWKS>;

export const ATProtoIdentityConfig = Type.Object({
  clientName: Type.String(),
  serviceUrl: Type.String(),
  currentKid: Type.String(),
  jwks: ATProtoJWKS,
  stateKeyPair: PasetoLocalKeyPair,
});
export type ATProtoIdentityConfig = Static<typeof ATProtoIdentityConfig>;
