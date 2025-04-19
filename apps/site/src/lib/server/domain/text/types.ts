import { type Static, Type, type TSchema } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const TextFlavor = Type.Enum({
  tiptap2: "tiptap2",
});
export type TextFlavor = Static<typeof TextFlavor>;
export const TextFlavorChecker = TypeCompiler.Compile(TextFlavor);

export const TextIntent = Type.Enum({
  longform: "longform",
  blurb: "blurb",
  usergenerated: "usergenerated",
});
export type TextIntent = Static<typeof TextIntent>;
export const TextIntentChecker = TypeCompiler.Compile(TextIntent);

export const BaseTextEnvelope = Type.Object({
  version: Type.Literal(1),
  flavor: TextFlavor,
  intent: TextIntent,
});
export type BaseTextEnvelope = Static<typeof BaseTextEnvelope>;
export const BaseTextEnvelopeChecker = TypeCompiler.Compile(BaseTextEnvelope);

export const Tiptap2TextEnvelope = Type.Composite([
  BaseTextEnvelope,
  Type.Object({
    tiptap2Content: Type.Any(),
  }),
]);
export type Tiptap2TextEnvelope = Static<typeof Tiptap2TextEnvelope>;
export const Tiptap2TextEnvelopeChecker = TypeCompiler.Compile(
  Tiptap2TextEnvelope
);

export const TextEnvelope = Type.Union([
  Tiptap2TextEnvelope,
]);
export type TextEnvelope = Static<typeof TextEnvelope>;
export const TextEnvelopeChecker = TypeCompiler.Compile(TextEnvelope);

export const TextEnvelopeBlurb = Type.Intersect([
  TextEnvelope,
  Type.Object({
    intent: Type.Literal("blurb"),
  }),
]);
export type TextEnvelopeBlurb = Static<typeof TextEnvelopeBlurb>;
export const TextEnvelopeBlurbChecker = TypeCompiler.Compile(TextEnvelopeBlurb);

export const TextEnvelopeLongform = Type.Intersect([
  TextEnvelope,
  Type.Object({
    intent: Type.Literal("longform"),
  }),
]);
export type TextEnvelopeLongform = Static<typeof TextEnvelopeLongform>;
export const TextEnvelopeLongformChecker = TypeCompiler.Compile(TextEnvelopeLongform);
