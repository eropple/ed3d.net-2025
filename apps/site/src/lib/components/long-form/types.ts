import type { PortableTextComponents } from "@portabletext/svelte";

export interface QuoteValue {
  body?: unknown[];
  speaker?: string;
  work?: string;
  citeHref?: string;
}

export interface SidenoteValue {
  _key: string;
  markdown: string;
  text?: string;
}

// Use more generic component props without relying on non-existent PortableTextComponentProps
export type PortableTextProps = {
  portableText: {
    value: Record<string, unknown>;
    [key: string]: unknown;
  };
  children?: unknown;
};
