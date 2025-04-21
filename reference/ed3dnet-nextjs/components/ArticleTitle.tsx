import Link from "next/link";
import React from "react";

import { PageTitle } from "./typography/PageTitle";

export type ArticleTitleProps = {
  title: string;
  href: string;
};

export const ArticleTitle: React.FC<ArticleTitleProps> = ({ title, href }) => {
  return (
    <PageTitle>
      <Link href={href}>{title}</Link>
    </PageTitle>
  );
};
