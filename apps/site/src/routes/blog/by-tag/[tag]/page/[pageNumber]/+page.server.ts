import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const POSTS_PER_PAGE = 10;

export const load: PageServerLoad = async ({ locals, params }) => {
  const logger = locals.logger.child({ fn: "/blog/by-tag/[tag]/page/[pageNumber]/+page.server.ts:load", params });
  const pageNumber = Math.max(1, parseInt(params.pageNumber, 10));
  const tag = params.tag.toLowerCase();

  const [blogPosts, blogCounts] = await Promise.all([
    locals.deps.blogPosts.listBlogPosts({
      offset: (pageNumber - 1) * POSTS_PER_PAGE,
      limit: POSTS_PER_PAGE,
      tag
    }),
    locals.deps.blogPosts.fetchBlogCounts()
  ]);

  if (blogPosts.length === 0) {
    logger.warn({ tag, pageNumber }, "No blog posts found for tag");
    throw error(404, {
      message: "No blog posts found for this tag"
    });
  }

  const totalCount = blogCounts.tags[tag] || 0;
  const lastPage = Math.ceil(totalCount / POSTS_PER_PAGE);

  return {
    title: `Posts with the "${tag}" tag`,
    description: "",
    pageNumber,
    lastPage,
    blogPosts,
    blogCounts,
    totalCount,
    tag,
    currentCountable: { type: "tag", value: tag }
  };
};