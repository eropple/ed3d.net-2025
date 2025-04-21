import {
  PortableText,
  type PortableTextReactComponents,
} from "@portabletext/react";
import React from "react";

import { FigureBlockQuote } from "./FigureBlockQuote";
import { FigureEpigraph } from "./FigureEpigraph";
import { Sidenote } from "./Sidenote";

const portableTextComponents: Partial<PortableTextReactComponents> = {
  block: {
    centered: ({ children }) => <p className="text-center">{children}</p>,
  },
  types: {
    blockQuote: ({ value }) => (
      <FigureBlockQuote
        speaker={value.speaker}
        work={value.work}
        citeHref={value.citeHref}
        body={value.body}
      />
    ),
    epigraph: ({ value }) => (
      <FigureEpigraph
        speaker={value.speaker}
        work={value.work}
        citeHref={value.citeHref}
        body={value.body}
      />
    ),
  },
  marks: {
    sidenote: ({ value }) => (
      <>
        <span title={JSON.stringify(value)}>{value.text}</span>
        <Sidenote id={value._key} markdown={value.markdown} />
      </>
    ),
  },
  unknownBlockStyle: ({ children }) => <p>UNKNOWN BLOCK STYLE - {children}</p>,
};

export type LongFormContentProps = {
  // TODO: fix this later
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
};

export const LongFormContent: React.FC<LongFormContentProps> = (props) => {
  return (
    <main className="long-form-content">
      <PortableText value={props.content} components={portableTextComponents} />
    </main>
  );
};
