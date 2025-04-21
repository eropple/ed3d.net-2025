import React from "react";

export type PageTitleProps = React.PropsWithChildren;

export const PageTitle: React.FC<PageTitleProps> = (props) => {
  return <h1 className="text-4xl font-medium">{props.children}</h1>;
};
