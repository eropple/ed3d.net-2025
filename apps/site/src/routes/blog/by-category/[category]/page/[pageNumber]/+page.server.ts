import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const POSTS_PER_PAGE = 10;

export const load: PageServerLoad = async ({ locals, params }) => {
  const logger = locals.logger.child({ fn: "/blog/by-category/[category]/page/[pageNumber]/+page.server.ts:load", params });
  const pageNumber = Math.max(1, parseInt(params.pageNumber, 10));
  const category = params.category.toLowerCase();

  const [blogPosts, blogCounts] = await Promise.all([
    locals.deps.blogPosts.listBlogPosts({
      offset: (pageNumber - 1) * POSTS_PER_PAGE,
      limit: POSTS_PER_PAGE,
      category
    }),
    locals.deps.blogPosts.fetchBlogCounts()
  ]);

  if (blogPosts.length === 0) {
    logger.warn({ category, pageNumber }, "No blog posts found for category");
    throw error(404, {
      message: "No blog posts found for this category"
    });
  }

  const totalCount = blogCounts.categories[category]?.total ?? 0;
  const lastPage = Math.ceil(totalCount / POSTS_PER_PAGE);

  return {
    title: `Posts in the "${category}" category`,
    description: "",
    pageNumber,
    lastPage,
    blogPosts,
    blogCounts,
    totalCount,
    category,
    currentCountable: { type: "category", value: category }
  };
};