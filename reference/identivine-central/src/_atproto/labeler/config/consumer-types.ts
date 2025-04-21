import { type Static, Type } from "@sinclair/typebox";

export const AtprotoLabelerBaseConfig = Type.Object({
  did: Type.String(),
  domain: Type.String(),
  preSharedKey: Type.String(),
});
export type AtprotoLabelerBaseConfig = Static<typeof AtprotoLabelerBaseConfig>;

export const AtprotoLabelerConsumerConfig = Type.Intersect([
  AtprotoLabelerBaseConfig,
]);
export type AtprotoLabelerConsumerConfig = Static<
  typeof AtprotoLabelerConsumerConfig
>;
