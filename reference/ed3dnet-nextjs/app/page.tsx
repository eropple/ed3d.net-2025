import { type Metadata } from "next";
import Image from "next/image";
import React from "react";

import { BlogBlurbListFetch } from "../components/blog/BlogBlurbListFetch";
import { BlogCountsFetch } from "../components/blog/BlogCountsFetch";
import { SITE_NAME } from "../lib/constants";

import { defaultMetadata } from "./metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateMetadata(): Metadata {
  return {
    ...defaultMetadata(),
    title: SITE_NAME,
    description:
      "Ed does a lot of things. You'll find a decent number of them here.",
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `Home | ${SITE_NAME}`,
    },
    twitter: {
      creator: "@edropple",
      card: "summary",
      site: SITE_NAME,
      description:
        "Ed does a lot of things. You'll find a decent number of them here.",
    },
  };
}

export default async function Home() {
  return (
    <>
      <div className="md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-8">
        <div className="md:col-span-2 lg:col-span-3">
          <BlogBlurbListFetch offset={0} limit={3} />
        </div>
        <div className="invisible md:visible">
          <Image
            src="/images/ed-index.jpg"
            alt="Ed's smiling face."
            width={781}
            height={781}
            className="h-auto w-full aspect-square mb-4"
            style={{ borderRadius: "5%" }}
          />
          <p className="text-sm mb-4">
            Hello. I am Ed. This is a blog. I blog here.
          </p>
          <p className="text-sm">Anybody wanna start a webring?</p>
          <hr className="my-4" />
          <BlogCountsFetch />
        </div>
      </div>
    </>
  );
}
