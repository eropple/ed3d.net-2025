import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  const { slug } = params;

  const logger = locals.logger.child({ fn: "/blog/posts/[slug]/+page.server.ts:load", params });
  const blogPost = await locals.deps.blogPosts.getBlogPost(
    {
      slug
    }
  );

  if (!blogPost) {
    logger.warn({ slug }, "Blog post not found");
    throw error(404, {
      message: "Blog post not found"
    });
  }

  logger.debug({ slug }, "Blog post found");

  return {
    slug,
    blogPost
  };
};
