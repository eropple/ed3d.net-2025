import { PortableText } from "@portabletext/react";
import React from "react";

import { type FigureBlockQuoteProps, makeCitation } from "./_quote-helpers";

export const FigureEpigraph: React.FC<FigureBlockQuoteProps> = (props) => {
  const citation = makeCitation(props);

  return (
    <figure className="figure-epigraph">
      <blockquote cite={props.citeHref}>
        <PortableText value={props.body} />
      </blockquote>
      {citation}
    </figure>
  );
};
