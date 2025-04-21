import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const ContentConfig = Type.Object({
  contentStage: Type.Union([
    Type.Literal("development"),
    Type.Literal("production"),
  ]),
  bypassCdnGlobal: Type.Boolean({ default: false }),
});
export type ContentConfig = Static<typeof ContentConfig>;
export const ContentConfigChecker = TypeCompiler.Compile(ContentConfig);
