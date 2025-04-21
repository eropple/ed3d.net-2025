import clsx from "clsx";
import { sortBy } from "lodash";
import { DateTime } from "luxon";
import Link from "next/link";
import React from "react";

import { type BlogCountsRollup } from "../../lib/sanity/queries/blogs/build-counts";
import { blogCategoryListUrl, blogTagListUrl } from "../../lib/url-builders";

export type BlogIndexProps = {
  rollup: BlogCountsRollup;
  current?: { type: string; value: string };
};

export const BlogCounts: React.FC<BlogIndexProps> = ({ rollup, current }) => {
  return (
    <div>
      <ul className={clsx(["list-none", "margin-none", "text-sm"])}>
        <li
          className={clsx([
            "italic",
            "underline",
            "decoration-dotted",
            "hover:decoration-solid",
            current?.type === "all" && "font-bold",
          ])}
          key="all"
        >
          <Link href="/blog" className="text-base">
            all posts ({rollup.all})
          </Link>
        </li>
        <li key="categories">
          <span className="text-base">categories</span>

          <ul className={clsx(["list-none", "ml-4"])}>
            {sortBy(Object.values(rollup.categories), "slug")
              .filter((category) => category.total > 0)
              .map((category) => (
                <li
                  key={category.slug}
                  title={category.description}
                  className={clsx([
                    "my-0",

                    current?.type === "category" &&
                      current.value === category.slug &&
                      "font-bold",
                  ])}
                >
                  <Link
                    className="italic underline decoration-dotted hover:decoration-solid"
                    href={blogCategoryListUrl(category.slug)}
                  >
                    {category.slug} ({category.total})
                  </Link>
                </li>
              ))}
          </ul>
        </li>
        <li key="tags">
          <span className="text-base">tags</span>

          <div className="ml-4">
            {sortBy(Object.entries(rollup.tags), 1)
              .filter((t) => t[1] > 0)
              .map((t, idx) => (
                <span
                  className={clsx([
                    "inline-block",
                    "italic",

                    idx > 0 && "pl-2",
                  ])}
                  key={t[0]}
                >
                  <Link
                    className="underline decoration-dotted hover:decoration-solid"
                    href={blogTagListUrl(t[0])}
                  >
                    {t[0]} ({t[1]})
                  </Link>
                </span>
              ))}
          </div>
        </li>
        {/* <li key="by-date">
          <span className="text-base">by date</span>

            <ul className={clsx([
              'list-none',
              'ml-4',
            ])}>
              {sortBy(Object.entries(rollup.byMonths), 0).map((t, idx) =>
                <li
                  className={clsx([
                    'my-0',

                    current?.type === 'date' && current.value === t[0] && 'font-bold',
                  ])}
                  key={t[0]}
                >
                  <Link className='underline decoration-dotted hover:decoration-solid' href={`/blog/by-date/${t[0]}`}>
                    {DateTime.fromObject({
                      year: parseInt(t[0].split('-')[0], 10),
                      month: parseInt(t[0].split('-')[1], 10),
                      day: 1,
                    }).toFormat('MMMM yyyy') } ({t[1]})
                  </Link>
                </li>
              )}
            </ul>
          </li> */}
      </ul>
    </div>
  );
};
