import { Type } from "@sinclair/typebox";

export function baseContentBlockRenderFields<
  const TKind extends string,
  const TVersion extends number,
>(
  kind: TKind & (string extends TKind ? never : unknown),
  version: TVersion & (number extends TVersion ? never : unknown),
) {
  return {
    t: Type.Literal("cr"),
    kind: Type.Literal(kind),
    version: Type.Literal(version),
  };
}
