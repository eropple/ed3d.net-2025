import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { ContentConfig } from "./content-config";

export const SanityConfig = Type.Object({
  apiVersion: Type.Optional(Type.String()),
  projectId: Type.String(),
  token: Type.String(),
  dataset: Type.String(),
  content: ContentConfig,
});
export type SanityConfig = Static<typeof SanityConfig>;
export const SanityConfigChecker = TypeCompiler.Compile(SanityConfig);
