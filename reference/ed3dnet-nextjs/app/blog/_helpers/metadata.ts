import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SITE_NAME } from "../../../lib/constants";

export const POSTS_PER_PAGE = 10;

export type CreateIndexMetadataArgs = {
  title: string;
  description: string;
  pageNumber: number;
  totalPostCount: number;
  urlForPage: (pageNumber: number) => string;
};

export function createIndexMetadata(args: CreateIndexMetadataArgs): Metadata {
  if (args.totalPostCount === 0) {
    return notFound();
  }

  const lastPage = Math.ceil(args.totalPostCount / POSTS_PER_PAGE);

  if (args.pageNumber < 1) {
    return redirect(args.urlForPage(1));
  }

  if (args.pageNumber > lastPage) {
    return notFound();
  }

  const titlePart =
    args.pageNumber === 1 && lastPage === 1
      ? args.title
      : `${args.title} - page ${args.pageNumber} of ${lastPage}`;

  const fullTitle = `${titlePart} | ${SITE_NAME}`;
  return {
    title: fullTitle,
    description: args.description,

    openGraph: {
      title: titlePart,
      siteName: SITE_NAME,
      description: fullTitle,
      images: [],
    },
    twitter: {
      card: "summary",
      site: SITE_NAME,
      creator: "@edropple",
      title: titlePart,
      description: fullTitle,
    },
  };
}
