import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { sortBy } from "lodash";

import { CONFIG } from "../../../config";
import { SanityCDN } from "../../client";

export const CategoryCountsResult = Type.Object({
  slug: Type.String(),
  description: Type.String(),
  total: Type.Number(),
});
export type CategoryCountsResult = Static<typeof CategoryCountsResult>;

const CountRollupResult = Type.Object({
  all: Type.Number(),
  categories: Type.Array(CategoryCountsResult),
  tags: Type.Array(
    Type.Object({
      slug: Type.String(),
      total: Type.Number(),
    }),
  ),
  byMonths: Type.Array(
    Type.Object({
      date: Type.String(),
    }),
  ),
});
type CountRollupResult = Static<typeof CountRollupResult>;
const CountRollupResultValidator = TypeCompiler.Compile(CountRollupResult);

export const BlogCountsRollup = Type.Object({
  all: Type.Number(),
  categories: Type.Record(Type.String(), CategoryCountsResult),
  tags: Type.Record(Type.String(), Type.Number()),
  byMonths: Type.Record(Type.String(), Type.Number()),
});
export type BlogCountsRollup = Static<typeof BlogCountsRollup>;

const queryBase = `
{
  'all': count(
    *[_type == 'blogPost' &&
      stages.${CONFIG().SANITY_CONTENT_STAGE}
    ]
  ),
  'tags': *[_type == 'blogTag'] {
    'slug': slug.current,
    'total':
      count(
        *[_type == 'blogPost' &&
          stages.${CONFIG().SANITY_CONTENT_STAGE} &&
          references(^._id)
        ]
      )
  } | order(totalReferences desc),
  'categories': *[_type == 'blogCategory'] {
    'slug': slug.current,
    description,
    'total':
      count(
        *[_type == 'blogPost' &&
          stages.${CONFIG().SANITY_CONTENT_STAGE} &&
          references(^._id)
        ]
      )
  } | order(totalReferences desc),
  'byMonths': *[_type == 'blogPost'] {
    'date': array::join(string::split(date, '-')[0..1], '-')
  }
}
`;

const query = () => queryBase;

export const fetchBlogCounts = async () => {
  const result = await SanityCDN().fetch(query(), {});

  if (!CountRollupResultValidator.Check(result)) {
    const errors = CountRollupResultValidator.Errors(result);
    console.error(result);
    console.error(errors);

    throw new Error(
      `Invalid result from Sanity: ${JSON.stringify(result)} -- ${JSON.stringify(errors)}`,
    );
  }

  const ret: BlogCountsRollup = {
    all: result.all,
    categories: Object.fromEntries(
      sortBy(result.categories, "slug").map((c) => [c.slug, c]),
    ),
    tags: Object.fromEntries(result.tags.map((t) => [t.slug, t.total])),
    byMonths: result.byMonths.reduce<Record<string, number>>((acc, cur) => {
      acc[cur.date] = (acc[cur.date] ?? 0) + 1;
      return acc;
    }, {}),
  };

  return ret;
};
