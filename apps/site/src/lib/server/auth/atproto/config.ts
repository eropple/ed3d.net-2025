// src/lib/server/auth/atproto/config.ts
import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { PrivateJWKS } from "../jwks.js";

export const ATProtoConfig = Type.Object({
  // Private keys for JWKs
  privateJwks: PrivateJWKS,
  handleResolver: Type.String({ default: "https://bsky.social/" }),
});

export type ATProtoConfig = Static<typeof ATProtoConfig>;
export const ATProtoConfigChecker = TypeCompiler.Compile(ATProtoConfig);