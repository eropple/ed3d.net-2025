import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const logger = locals.logger.child({ fn: "/+page.server.ts:load" });

  const [blogPosts, blogCounts] = await Promise.all([
    locals.deps.blogPosts.listBlogPosts({
      offset: 0,
      limit: 3
    }),
    locals.deps.blogPosts.fetchBlogCounts()
  ]);

  logger.debug({ blogPostCount: blogPosts.length }, "Loaded blog posts for homepage");

  return {
    blogPosts,
    blogCounts
  };
};