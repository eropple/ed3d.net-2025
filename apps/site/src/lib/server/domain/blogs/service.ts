import type { SanityClient } from "@sanity/client";
import _ from "lodash";
import type { Logger } from "pino";

import type { ContentConfig } from "../../sanity/content-config.js";

import type {
  BlogPostType,
  BlogPostShortType,
  GetBlogPostParamsType,
  ListBlogPostsParamsType,
  BlogCountsType,
} from "$lib/domain/blogs/types.js";
import {
  blogProjection,
  blogShortProjection,
  type BlogContent,
  type BlogShortContent,
} from "$lib/server/domain/blogs/projections.js";
import { q, type QueryRunner } from "$lib/server/sanity/query-builder.js";

export class BlogPostService {
  private readonly contentStage: string;

  constructor(
    private readonly logger: Logger,
    private readonly sanityCdn: SanityClient,
    private readonly sanityDirect: SanityClient,
    private readonly sanityQueryCdn: QueryRunner,
    private readonly sanityQueryDirect: QueryRunner,
    contentConfig: ContentConfig,
  ) {
    this.contentStage = contentConfig.contentStage;
  }

  /**
   * Get a single blog post by slug
   */
  async getBlogPost(
    params: GetBlogPostParamsType,
    bypassCdn = false
  ): Promise<BlogPostType | null> {
    const query = q
      .parameters<GetBlogPostParamsType>()
      .star.filterByType("blogPost")
      .filterBy("slug.current == $slug")
      .filterRaw(`stages.${this.contentStage} == true`)
      .project(blogProjection);

    const runner = bypassCdn ? this.sanityQueryDirect : this.sanityQueryCdn;
    this.logger.debug({ method: "getBlogPost", slug: params.slug, bypassCdn }, "Fetching blog post");

    const blogPost: BlogContent | undefined = (await runner(query, { parameters: params }))[0];

    if (!blogPost) {
      return null;
    }

    // Transform from Sanity type to client type
    return BlogPostService._transformBlogPost(blogPost);
  }

  /**
   * List blog posts with pagination and filtering
   */
  async listBlogPosts(
    params: ListBlogPostsParamsType,
    bypassCdn = false
  ): Promise<BlogPostType[]> {
    const query = this.buildListQuery(params, false).project(blogProjection);
    const runner = bypassCdn ? this.sanityQueryDirect : this.sanityQueryCdn;

    this.logger.debug({ method: "listBlogPosts", params, bypassCdn }, "Listing blog posts");

    const posts: BlogContent[] = await runner(query, { parameters: params });

    // Transform from Sanity type to client type
    return posts.map((post) => BlogPostService._transformBlogPost(post));
  }

  /**
   * List blog posts (short version) with pagination and filtering
   */
  async listBlogPostsShort(
    params: ListBlogPostsParamsType,
    bypassCdn = false
  ): Promise<BlogPostShortType[]> {
    const query = this.buildListQuery(params, true).project(blogShortProjection);
    const runner = bypassCdn ? this.sanityQueryDirect : this.sanityQueryCdn;

    this.logger.debug({ method: "listBlogPostsShort", params, bypassCdn }, "Listing blog posts (short)");

    const posts: BlogShortContent[] = await runner(query, { parameters: params });

    // Transform from Sanity type to client type
    return posts.map((post) => BlogPostService._transformBlogPostShort(post));
  }

  /**
   * Fetch blog counts for categories, tags, and months
   */
  async fetchBlogCounts(bypassCdn = false): Promise<BlogCountsType> {
    const queryBase = `
    {
      'all': count(
        *[_type == 'blogPost' &&
          stages.${this.contentStage}
        ]
      ),
      'tags': *[_type == 'blogTag'] {
        'slug': slug.current,
        'total':
          count(
            *[_type == 'blogPost' &&
              stages.${this.contentStage} &&
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
              stages.${this.contentStage} &&
              references(^._id)
            ]
          )
      } | order(totalReferences desc),
      'byMonths': *[_type == 'blogPost'] {
        'date': array::join(string::split(date, '-')[0..1], '-')
      }
    }
    `;

    const sanityClient = bypassCdn
      ? this.sanityDirect
      : this.sanityCdn;

    this.logger.debug({ method: "fetchBlogCounts", bypassCdn }, "Fetching blog counts");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await sanityClient.fetch(queryBase, {});

    // Transform to client type
    // TODO: this is a mess, we need to fix the types
    const countData: BlogCountsType = {
      all: result.all,
      categories: Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _.sortBy(result.categories, "slug").map((c: any) => [c.slug, c]),
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tags: Object.fromEntries(result.tags.map((t: any) => [t.slug, t.total])),
      byMonths:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.byMonths.reduce((acc: Record<string, number>, cur: any) => {
          acc[cur.date] = (acc[cur.date] ?? 0) + 1;
          return acc;
        }, {}),
    };

    return countData;
  }

  // Private helper methods
  private buildListQuery(params: ListBlogPostsParamsType, isShort: boolean) {
    const count = params.limit ?? 10;
    const start = (params.offset ?? 0) * count;

    let query = q
      .parameters<ListBlogPostsParamsType>()
      .star.filterByType("blogPost")
      .filterRaw(`stages.${this.contentStage} == true`);

    if (params.category) {
      query = query.filterRaw("category->slug.current == $category");
    }

    if (params.tag) {
      query = query.filterRaw(`$tag in tags[]->slug.current`);
    }

    query = query
      .order("date desc")
      .order("title desc") // tiebreaker
      .slice(start, start + count);

    return query;
  }

  private static _transformBlogPost(blogPost: BlogContent): BlogPostType {
    // Transform the blog post to match the TypeBox schema
    return {
      ...BlogPostService._transformBlogPostShort(blogPost),
      body: blogPost.body.map(block => {
        // Type transformations to handle null vs undefined differences
        if (block._type === "block") {
          return {
            ...block,
            children: block.children || undefined,
            markDefs: block.markDefs || undefined,
            style: block.style || undefined,
            listItem: block.listItem || undefined,
            level: block.level || undefined,
          };
        }
        return block;
      }),
    };
  }

  private static _transformBlogPostShort(blogShort: BlogShortContent): BlogPostShortType {
    return {
      slug: blogShort.slug,
      title: blogShort.title,
      blurb: blogShort.blurb,
      date: blogShort.date,
      author: {
        slug: blogShort.author.slug,
        fullName: blogShort.author.fullName,
        shortName: blogShort.author.shortName,
        email: blogShort.author.email,
        url: blogShort.author.url,
        avatar: blogShort.author.avatar && blogShort.author.avatar.url ? {
          url: blogShort.author.avatar.url,
          altText: blogShort.author.avatar.altText ?? "",
        } : undefined,
      },
      category: {
        slug: blogShort.category.slug,
        description: blogShort.category.description,
      },
      tags: (blogShort.tags || []).map(tag => ({
        slug: tag.slug,
      })),
    };
  }
}