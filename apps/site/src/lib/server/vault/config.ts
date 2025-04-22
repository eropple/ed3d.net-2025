import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const VaultConfig = Type.Object({
  primaryKey: Type.String(),
  legacyKeys: Type.Optional(Type.Array(Type.String()))
});

export type VaultConfig = Static<typeof VaultConfig>;
export const VaultConfigChecker = TypeCompiler.Compile(VaultConfig);