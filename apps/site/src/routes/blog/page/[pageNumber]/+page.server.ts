import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const POSTS_PER_PAGE = 10;

export const load: PageServerLoad = async ({ locals, params }) => {
  const logger = locals.logger.child({ fn: "/blog/page/[pageNumber]/+page.server.ts:load", params });
  const pageNumber = Math.max(1, parseInt(params.pageNumber, 10));

  const [blogPosts, blogCounts] = await Promise.all([
    locals.deps.blogPosts.listBlogPosts({
      offset: (pageNumber - 1) * POSTS_PER_PAGE,
      limit: POSTS_PER_PAGE
    }),
    locals.deps.blogPosts.fetchBlogCounts()
  ]);

  if (blogPosts.length === 0) {
    logger.warn({ pageNumber }, "No blog posts found for page");
    throw error(404, {
      message: "No blog posts found for this page"
    });
  }

  const totalCount = blogCounts.all;
  const lastPage = Math.ceil(totalCount / POSTS_PER_PAGE);

  return {
    title: "All posts",
    description: "",
    pageNumber,
    lastPage,
    blogPosts,
    blogCounts,
    totalCount,
    currentCountable: { type: "all", value: "" },
  };
};