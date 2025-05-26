import { error, fail } from "@sveltejs/kit";
import type { Actions } from "@sveltejs/kit";
import type { Logger } from "pino";

import type { BlogContent } from "../../../../lib/server/domain/blogs/projections.js";
import type { TipTapPresetKind } from "../../../../lib/shared/tiptap-presets.js";

import type { PageServerLoad, ActionData } from "./$types";

import type { BlogPostCommentTree, BlogPostCommentType as BlogPostCommentTypeDTO } from "$lib/domain/blogs/types.js";
import { CommentIds, type CommentId } from "$lib/domain/comments/ids.js";
import type { BlogPostService } from "$lib/server/domain/blogs/service.js";
import { validateTiptapJson } from "$lib/server/utils/tiptap-validation.js";


// Internal function to fetch comments
async function _fetchBlogPostComments(
  blogPostService: BlogPostService,
  blogPostId: string,
  logger: Logger,
  isRequestingUserStaff: boolean,
): Promise<BlogPostCommentTree> {
  logger.debug({ blogPostId, isRequestingUserStaff }, "Fetching comments for blog post via _fetchBlogPostComments");
  try {
    const commentsTree = await blogPostService.getCommentsForPost(blogPostId, isRequestingUserStaff);
    return commentsTree;
  } catch (err) {
    logger.error({ err, blogPostId }, "Error fetching blog post comments");
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

  const isStaff = locals.user?.grants.isStaff ?? false;

  const commentsTree = await _fetchBlogPostComments(locals.deps.blogPosts, blogPost.id, logger, isStaff);

  const imageUrlsByKey: Record<string, string> = {};

  for (const item of blogPost.body as BlogContent["body"]) {
    if (item._type === "imageWithAlt" && item.image) {
      imageUrlsByKey[item._key] = item.image.url!;
    }
  }

  return {
    slug,
    blogPost,
    commentsTree,
    imageUrlsByKey,
    isStaff,
  };
};

export const actions: Actions = {
  refreshComments: async ({ locals, params }) => {
    const logger = locals.logger.child({ fn: "/blog/posts/[slug]/+page.server.ts:actions:refreshComments", params });

    if (!params.slug) {
      logger.warn({ params }, "No slug provided");
      return fail(400, { error: "No slug provided" });
    }

    const blogPost = await locals.deps.blogPosts.getBlogPost({ slug: params.slug });
    if (!blogPost) {
      logger.warn({ slug: params.slug }, "Blog post not found during refreshComments action");
      return fail(404, { error: "Blog post not found" });
    }

    const isStaff = locals.user?.grants.isStaff ?? false;
    const commentsTree = await _fetchBlogPostComments(locals.deps.blogPosts, blogPost.id, logger, isStaff);

    return {
      refreshedComments: commentsTree,
      isStaff,
    };
  },

  addComment: async ({ locals, params, request }) => {
    const logger = locals.logger.child({ fn: "/blog/posts/[slug]/+page.server.ts:actions:addComment", params });
    const formData = await request.formData();
    const commentJsonString = formData.get("comment_json_content") as string | null;
    const parentCommentIdString = formData.get("parent_comment_id") as string | null;
    const parentCommentId = parentCommentIdString ? CommentIds.toRichId(parentCommentIdString) : null;

    const isStaff = locals.user?.grants.isStaff ?? false;

    const createFailResponse = (status: number, errorMsg: string, details?: string) => {
      return fail(status, {
        error: errorMsg,
        details,
        parentCommentIdAttempted: parentCommentId || null,
        isStaff,
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
    if (!locals.user.grants.comments.post) {
        logger.warn({ userId: locals.user.userId }, "User not permitted to post comments.");
        return createFailResponse(403, "You are not permitted to post comments at this time.");
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

      const updatedCommentsTree = await _fetchBlogPostComments(locals.deps.blogPosts, blogPostId, logger, isStaff);

      return {
        success: true,
        newComment: newComment as BlogPostCommentTypeDTO,
        refreshedComments: updatedCommentsTree,
        isStaff,
      };
    } catch (e) {
      const serviceError = e as Error;
      logger.error(serviceError, "Error calling blogPostService.addComment");
      return createFailResponse(500, serviceError.message || "Could not save comment. Please try again.", serviceError.stack);
    }
  },

  toggleCommentVisibility: async ({ locals, params, request }) => {
    const logger = locals.logger.child({ fn: "/blog/posts/[slug]/+page.server.ts:actions:toggleCommentVisibility", params });
    const formData = await request.formData();

    const commentIdString = formData.get("commentId") as string | null;
    const hideStateString = formData.get("hideState") as string | null;

    const isStaffCurrentUser = locals.user?.grants.isStaff ?? false;

    const createToggleFailResponse = (status: number, errorMsg: string, details?: string) => {
      return fail(status, {
        error: errorMsg,
        details,
        commentIdAttempted: commentIdString,
        isStaff: isStaffCurrentUser,
      });
    };

    if (!params.slug) {
      logger.warn("No slug provided for toggleCommentVisibility.");
      return createToggleFailResponse(400, "Cannot identify blog post.");
    }

    if (!locals.user || !locals.user.userId) {
      logger.warn("Unauthenticated user attempted to toggle comment visibility.");
      return createToggleFailResponse(401, "You must be logged in.");
    }

    if (!locals.user.grants.comments.moderate) {
      logger.warn({ userId: locals.user.userId }, "User not authorized to moderate comments.");
      return createToggleFailResponse(403, "You are not authorized to perform this action.");
    }

    if (!commentIdString || !hideStateString) {
        logger.warn({ commentIdString, hideStateString }, "Missing commentId or hideState for toggleCommentVisibility.");
        return createToggleFailResponse(400, "Missing required parameters to change comment visibility.");
    }

    const commentId = CommentIds.toRichId(commentIdString);
    const newHideState = hideStateString === "true";

    const blogPost = await locals.deps.blogPosts.getBlogPost({ slug: params.slug });
    if (!blogPost) {
      logger.warn({ slug: params.slug }, "Blog post not found during toggleCommentVisibility action");
      return createToggleFailResponse(404, "Blog post not found.");
    }

    try {
      const updatedComment = await locals.deps.blogPosts.setCommentHiddenStatus(
        commentId,
        newHideState,
        locals.user.userId
      );

      if (!updatedComment) {
        logger.warn({ commentId }, "Comment not found or failed to update hidden status.");
        return createToggleFailResponse(404, "Comment not found or could not be updated.");
      }

      logger.info({ commentId: updatedComment.commentId, hidden: updatedComment.hiddenAt }, "Successfully toggled comment visibility. Fetching updated tree.");

      const commentsTree = await _fetchBlogPostComments(locals.deps.blogPosts, blogPost.id, logger, isStaffCurrentUser);

      return {
        success: true,
        toggledCommentId: updatedComment.commentId,
        newHiddenState: !!updatedComment.hiddenAt,
        refreshedComments: commentsTree,
        isStaff: isStaffCurrentUser,
      };

    } catch (e) {
      const serviceError = e as Error;
      logger.error(serviceError, "Error calling blogPostService.setCommentHiddenStatus");
      return createToggleFailResponse(500, serviceError.message || "Could not update comment visibility. Please try again.", serviceError.stack);
    }
  }
};
