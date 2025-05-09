import type { AnyExtension } from "@tiptap/core";
import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Text from "@tiptap/extension-text";
import TextStyle from "@tiptap/extension-text-style";

export type TipTapPresetKind = "comment";

export interface TipTapPreset {
  extensions: AnyExtension[];
}

const commentPresetExtensions: AnyExtension[] = [
  Document,
  Paragraph,
  Text,
  Blockquote,
  BulletList.configure({
    HTMLAttributes: {
      class: "list-disc pl-5", // Example Tailwind styling
    },
  }),
  OrderedList.configure({
    HTMLAttributes: {
      class: "list-decimal pl-5", // Example Tailwind styling
    },
  }),
  ListItem,
  CodeBlock.configure({
    HTMLAttributes: {
      class: "bg-gray-100 p-2 rounded text-sm", // Example Tailwind styling
    },
  }),
  Bold,
  Italic,
  Code, // Inline code
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      rel: "nofollow ugc",
      target: "_blank",
      // Consider adding a class for styling links if needed
      // class: "text-blue-500 hover:underline",
    },
    autolink: true, // Automatically detect links as the user types
    linkOnPaste: true, // Automatically create links when pasting URLs
  }),
  Subscript,
  Superscript,
  TextStyle, // Allows for applying inline styles like color, font-family.
            // We might not expose UI for all its features in a simple comment editor.
];

export const tipTapPresets: Record<TipTapPresetKind, TipTapPreset> = {
  comment: {
    extensions: commentPresetExtensions,
  },
};

/**
 * Helper function to get the extensions for a given preset.
 * This can be useful on both client and server side.
 */
export function getPresetExtensions(kind: TipTapPresetKind): AnyExtension[] {
  const preset = tipTapPresets[kind];
  if (!preset) {
    throw new Error(`Unknown TipTapPresetKind: ${kind}`);
  }
  return preset.extensions;
}