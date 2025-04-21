import { PortableText } from "@portabletext/react";
import { marked } from "marked";
import React from "react";

export type SidenoteProps = {
  id: string;
  markdown: string;
};

export const Sidenote: React.FC<SidenoteProps> = (props) => {
  return (
    <>
      <label
        htmlFor={`sn-${props.id}`}
        className="margin-toggle sidenote-number"
      />
      <input type="checkbox" id={`sn-${props.id}`} className="margin-toggle" />
      <span
        className="sidenote"
        dangerouslySetInnerHTML={{
          __html: "<span>" + marked.parseInline(props.markdown) + "</span>",
        }}
      />
    </>
  );
};
