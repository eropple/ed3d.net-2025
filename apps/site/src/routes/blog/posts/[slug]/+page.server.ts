import { error, fail } from "@sveltejs/kit";
import type { Actions } from "@sveltejs/kit";
import type { Logger } from "pino";

import type { BlogContent } from "../../../../lib/server/domain/blogs/projections.js";
import type { TipTapPresetKind } from "../../../../lib/shared/tiptap-presets.js";

import type { PageServerLoad } from "./$types";

import type { BlogPostCommentTree, BlogPostCommentType as BlogPostCommentTypeDTO } from "$lib/domain/blogs/types.js";
import { CommentIds, type CommentId } from "$lib/domain/comments/ids.js";
import type { BlogPostService } from "$lib/server/domain/blogs/service.js";
import { validateTiptapJson } from "$lib/server/utils/tiptap-validation.js";


// Internal function to fetch comments
async function _fetchBlogPostComments(
  blogPostService: BlogPostService,
  blogPostId: string,
  logger: Logger,
): Promise<BlogPostCommentTree> {
  logger.debug({ blogPostId }, "Fetching comments for blog post via _fetchBlogPostComments");
  try {
    const commentsTree = await blogPostService.getCommentsForPost(blogPostId);
    return commentsTree;
  } catch (err) {
    logger.error({ err, blogPostId }, "Error fetching blog post comments");
    // Return an empty tree or re-throw, depending on desired error handling for comments
    return { __type: "BlogPostCommentTree", children: [] };
  }
}

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

  const commentsTree = await _fetchBlogPostComments(locals.deps.blogPosts, blogPost.id, logger);

  const imageUrlsByKey: Record<string, string> = {};

  // TODO: this cast is not great. I'm not sure how to prove it's OK though.
  for (const item of blogPost.body as BlogContent["body"]) {
    if (item._type === "imageWithAlt" && item.image) {
      imageUrlsByKey[item._key] = item.image.url!;
    }
  }

  return {
    slug,
    blogPost,
    commentsTree,
    imageUrlsByKey
  };
};

export const actions: Actions = {
  refreshComments: async ({ locals, params }) => {
    const logger = locals.logger.child({ fn: "/blog/posts/[slug]/+page.server.ts:actions:refreshComments", params });

    if (!params.slug) {
      logger.warn({ params }, "No slug provided");
      throw error(400, "No slug provided");
    }

    const blogPost = await locals.deps.blogPosts.getBlogPost({ slug: params.slug });
    if (!blogPost) {
      logger.warn({ slug: params.slug }, "Blog post not found during refreshComments action");
      throw error(404, "Blog post not found");
    }

    const commentsTree = await _fetchBlogPostComments(locals.deps.blogPosts, blogPost.id, logger);

    return {
      refreshedComments: commentsTree,
    };
  },

  addComment: async ({ locals, params, request }) => {
    const logger = locals.logger.child({ fn: "/blog/posts/[slug]/+page.server.ts:actions:addComment", params });
    const formData = await request.formData();
    const commentJsonString = formData.get("comment_json_content") as string | null;
    const parentCommentId = formData.get("parent_comment_id") ? CommentIds.toRichId(formData.get("parent_comment_id") as string) : null;

    // Helper function to create consistent failure responses
    // It captures parentCommentIdRich in its closure.
    const createFailResponse = (status: number, errorMsg: string, details?: string) => {
      return fail(status, {
        error: errorMsg,
        details,
        parentCommentIdAttempted: parentCommentId || null
      });
    };

    if (!params.slug) {
      logger.warn({ params }, "No slug provided for addComment.");
      return createFailResponse(400, "Cannot identify blog post.");
    }

    if (!locals.user || !locals.user.userId) {
      logger.warn("Unauthenticated user attempted to add comment.");
      return createFailResponse(401, "You must be logged in to comment.");
    }
    const authorUserId = locals.user.userId;

    const blogPost = await locals.deps.blogPosts.getBlogPost({ slug: params.slug });
    if (!blogPost) {
      logger.error({ slug: params.slug }, "Blog post not found when trying to add comment.");
      return createFailResponse(404, "Blog post not found.");
    }
    const blogPostId = blogPost.id;

    if (!commentJsonString) {
      logger.warn("Comment JSON content missing from form submission.");
      return createFailResponse(400, "Comment content is missing.");
    }

    let parsedCommentJson;
    try {
      parsedCommentJson = JSON.parse(commentJsonString);
    } catch (e) {
      logger.warn(e, "Failed to parse comment JSON content from form.");
      return createFailResponse(400, "Invalid comment content format.", "JSON parsing failed.");
    }

    const presetToValidate: TipTapPresetKind = "comment";
    const validationResult = validateTiptapJson(logger, parsedCommentJson, presetToValidate);

    if (!validationResult.isValid) {
      logger.warn({ validationError: validationResult.error, details: validationResult.details }, "Tiptap JSON validation failed.");
      return createFailResponse(400, validationResult.error || "Invalid comment content.", validationResult.details);
    }

    try {
      const newComment = await locals.deps.blogPosts.addComment({
        blogPostId: blogPostId,
        authorUserId: authorUserId,
        textContent: validationResult,
        parentCommentId: parentCommentId ?? undefined
      });

      logger.info({ commentId: newComment.commentId, blogPostId, parentCommentId: newComment.parentCommentId }, "Successfully added new comment via action. Now fetching updated comment tree.");

      const updatedCommentsTree = await _fetchBlogPostComments(locals.deps.blogPosts, blogPostId, logger);

      return {
        success: true,
        newComment: newComment as BlogPostCommentTypeDTO,
        refreshedComments: updatedCommentsTree,
      };
    } catch (e) {
      const serviceError = e as Error;
      logger.error(serviceError, "Error calling blogPostService.addComment");
      return createFailResponse(500, serviceError.message || "Could not save comment. Please try again.", serviceError.stack);
    }
  }
};
