import { PortableText } from "@portabletext/react";
import React from "react";

import { type FigureBlockQuoteProps, makeCitation } from "./_quote-helpers";

export const FigureBlockQuote: React.FC<FigureBlockQuoteProps> = (props) => {
  const citation = makeCitation(props);

  return (
    <figure className="figure-blockquote">
      <blockquote cite={props.citeHref}>
        <PortableText value={props.body} />
      </blockquote>
      {citation}
    </figure>
  );
};
