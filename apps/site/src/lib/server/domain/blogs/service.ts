import type { SanityClient } from "@sanity/client";
import { desc, eq, and } from "drizzle-orm";
import _ from "lodash";
import type { Logger } from "pino";
import type { Node } from "prosemirror-model";
import type { Node as ProseMirrorNodeJSON } from "prosemirror-model";

import { TextIds } from "../../../domain/texts/ids.js";
import type { ContentConfig } from "../../sanity/content-config.js";

import type {
  BlogPostType,
  BlogPostShortType,
  GetBlogPostParamsType,
  ListBlogPostsParamsType,
  BlogCountsType,
  BlogPostCommentType as BlogPostCommentTypeDTO,
  BlogPostCommentNode,
  BlogPostCommentTree,
  HiddenCommentPlaceholderType,
  BlogPostCommentNodeValue
} from "$lib/domain/blogs/types.js";
import { CommentIds, type CommentId } from "$lib/domain/comments/ids.js";
import { type TextContentType } from "$lib/domain/texts/types.js";
import { UserIds, type UserId } from "$lib/domain/users/ids.js";
import { type UserPublic } from "$lib/domain/users/types.js";
import { BLOG_POST_COMMENTS, type DBBlogPostComment } from "$lib/server/db/schema/index.js";
import type { Drizzle, DrizzleRO } from "$lib/server/db/types.js";
import {
  blogProjection,
  blogShortProjection,
  type BlogContent,
  type BlogShortContent,
} from "$lib/server/domain/blogs/projections.js";
import type { TextService } from "$lib/server/domain/texts/service.js";
import { UserService } from "$lib/server/domain/users/service.js";
import { q, type QueryRunner } from "$lib/server/sanity/query-builder.js";
import type { TipTapPresetKind } from "$lib/shared/tiptap-presets.js";

export class BlogPostService {
  private readonly contentStage: string;
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly sanityCdn: SanityClient,
    private readonly sanityDirect: SanityClient,
    private readonly sanityQueryCdn: QueryRunner,
    private readonly sanityQueryDirect: QueryRunner,
    contentConfig: ContentConfig,
    private readonly textService: TextService,
    private readonly userService: UserService,
    private readonly db: Drizzle,
    private readonly dbRO: DrizzleRO,
  ) {
    this.contentStage = contentConfig.contentStage;
    this.logger = logger.child({ component: BlogPostService.name });
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
      id: blogShort.id,
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

  private async _toBlogPostCommentDTO(
    dbComment: DBBlogPostComment,
    author: UserPublic,
    textContent: TextContentType
  ): Promise<BlogPostCommentTypeDTO> {
    if (!dbComment.createdAt) {
      // This should ideally not happen if data is consistent
      this.logger.error({ dbComment }, "DBBlogPostComment missing createdAt, falling back to current date");
    }
    return {
      __type: "BlogPostComment",
      commentId: CommentIds.toRichId(dbComment.commentUuid),
      blogPostId: dbComment.sanityBlogPostId,
      author: author,
      textContent: textContent,
      parentCommentId: dbComment.parentCommentUuid ? CommentIds.toRichId(dbComment.parentCommentUuid) : undefined,
      createdAt: dbComment.createdAt || new Date(), // Ensure createdAt is a Date
      updatedAt: dbComment.updatedAt || undefined,
      hiddenAt: dbComment.hiddenAt || undefined, // Add hiddenAt
    };
  }

  async addComment(
    params: {
      blogPostId: string;
      authorUserId: UserId;
      textContent: {
        presetKind: TipTapPresetKind;
        jsonContent: ProseMirrorNodeJSON;
      };
      parentCommentId?: CommentId;
    },
    providedExecutor: Drizzle = this.db
  ): Promise<BlogPostCommentTypeDTO> {
    const logger = this.logger.child({
      fn: "addComment",
      blogPostId: params.blogPostId,
      authorUserId: params.authorUserId,
      parentCommentId: params.parentCommentId,
    });

    const operation = async (executor: Drizzle): Promise<BlogPostCommentTypeDTO> => {
      // 1. Create the text content for the comment
      const textContent = await this.textService.createText(params.textContent, executor);

      if (!textContent) {
        logger.error("Failed to create text content for comment.");
        throw new Error("Could not save comment content.");
      }

      // 2. Insert the comment into the database
      const [dbComment] = await executor
        .insert(BLOG_POST_COMMENTS)
        .values({
          sanityBlogPostId: params.blogPostId,
          userUuid: UserIds.toUUID(params.authorUserId),
          textUuid: TextIds.toUUID(textContent.textId),
          parentCommentUuid: params.parentCommentId ? CommentIds.toUUID(params.parentCommentId) : null,
          // hiddenAt will default to null in the DB
        })
        .returning();

      if (!dbComment) {
        logger.error("Failed to insert comment into database after creating text content.");
        // Potentially attempt to delete the created text content if we want to be super clean
        // await this.textService.deleteText(textContent.textId, executor); // Example
        throw new Error("Could not save comment record.");
      }

      // 3. Fetch the author's public details
      const author = await this.userService.getById(params.authorUserId, executor);
      if (!author) {
        // This case is unlikely if authorUserId was validated upstream or if it's from a session
        logger.error({ authorUserId: params.authorUserId }, "Author not found when creating comment DTO.");
        throw new Error("Comment author not found.");
      }

      // 4. Convert to DTO
      // The _toBlogPostCommentDTO will now include hiddenAt, which will be null for new comments
      return this._toBlogPostCommentDTO(dbComment, UserService.toPublic(author), textContent);
    };

    if (providedExecutor === this.db) {
      logger.debug("No external transaction, creating new one for addComment.");
      return this.db.transaction(async (tx) => {
        return operation(tx);
      });
    } else {
      logger.debug("External transaction executor provided, using it for addComment.");
      return operation(providedExecutor);
    }
  }

  async getCommentsForPost(
    blogPostId: string, // This is the sanityBlogPostId
    isRequestingUserStaff: boolean = false, // New parameter
    executor: DrizzleRO = this.dbRO,
  ): Promise<BlogPostCommentTree> {
    const logger = this.logger.child({ fn: "getCommentsForPost", blogPostId, isRequestingUserStaff });
    logger.debug("Fetching comments for post.");

    const dbComments = await executor
      .select()
      .from(BLOG_POST_COMMENTS)
      .where(eq(BLOG_POST_COMMENTS.sanityBlogPostId, blogPostId))
      .orderBy(desc(BLOG_POST_COMMENTS.createdAt)); // Fetch newest first for easier tree building if needed, or sort later

    if (dbComments.length === 0) {
      logger.debug("No comments found for post.");
      return { __type: "BlogPostCommentTree", children: [] };
    }

    logger.debug({ count: dbComments.length }, "Fetched raw comments from DB.");

    // Fetch all unique user IDs and text IDs
    const userUuids = _.uniq(dbComments.map(c => c.userUuid));
    const textUuids = _.uniq(dbComments.map(c => c.textUuid));

    // Batch fetch authors and text contents
    const authorsPromises = userUuids.map(uuid => this.userService.getByUserUUID(uuid, executor));
    const textContentsPromises = textUuids.map(uuid => this.textService.getLatestTextById(TextIds.toRichId(uuid), executor));

    const authorsResults = await Promise.all(authorsPromises);
    const textContentsResults = await Promise.all(textContentsPromises);

    const authorsByUuid = _.keyBy(authorsResults.filter(Boolean).map(i => UserService.toPublic(i!)), "userId");
    const textContentsByTextId = _.keyBy(textContentsResults.filter(Boolean), "textId");

    const commentNodes: Record<string, BlogPostCommentNode> = {};
    const rootComments: BlogPostCommentNode[] = [];

    // First pass: create all nodes and map them
    for (const dbComment of dbComments) {
      const commentRichId = CommentIds.toRichId(dbComment.commentUuid);
      const author = authorsByUuid[UserIds.toRichId(dbComment.userUuid)];
      const textContent = textContentsByTextId[TextIds.toRichId(dbComment.textUuid)];

      if (!author || !textContent) {
        logger.warn({ commentUuid: dbComment.commentUuid, missingAuthor: !author, missingText: !textContent }, "Skipping comment due to missing author or text content.");
        continue;
      }

      let nodeValue: BlogPostCommentNodeValue;

      if (!isRequestingUserStaff && dbComment.hiddenAt) {
        nodeValue = {
          __type: "HiddenCommentPlaceholder",
          commentId: commentRichId,
          createdAt: dbComment.createdAt || new Date(), // Ensure createdAt is a Date
                          message: "This comment has been hidden by a staff member.",
        };
      } else {
        // _toBlogPostCommentDTO now correctly populates hiddenAt
        nodeValue = await this._toBlogPostCommentDTO(dbComment, author, textContent);
      }

      commentNodes[commentRichId] = {
        __type: "BlogPostCommentNode",
        value: nodeValue,
        children: [],
      };
    }

    // Second pass: build the tree structure
    for (const dbComment of dbComments) {
      const commentRichId = CommentIds.toRichId(dbComment.commentUuid);
      const node = commentNodes[commentRichId];
      if (!node) continue; // Should not happen if node was created in first pass

      if (dbComment.parentCommentUuid) {
        const parentRichId = CommentIds.toRichId(dbComment.parentCommentUuid);
        const parentNode = commentNodes[parentRichId];
        if (parentNode) {
          // Add to parent's children, maintaining order (e.g., oldest first for replies)
          // The initial fetch is newest first, so for children, we might want to unshift or sort later.
          // For now, let's add and assume client-side will sort children if necessary,
          // or we sort here. Replies are typically oldest first.
          parentNode.children.unshift(node); // Or .push(node) and sort parentNode.children later
        } else {
          // Parent comment was hidden or deleted, or data inconsistency
          // Add as a root comment for now, or handle as orphaned
          logger.warn({ commentId: commentRichId, parentId: parentRichId }, "Parent comment not found in map, adding as root.");
          rootComments.push(node);
        }
      } else {
        rootComments.push(node);
      }
    }

    // Sort root comments (e.g., oldest first or newest first based on a preference)
    // The initial fetch was `desc(createdAt)`. If we want roots oldest first:
    rootComments.sort((a, b) => new Date(a.value.createdAt).getTime() - new Date(b.value.createdAt).getTime());

    // Sort children of each node (typically replies are oldest first)
    for (const nodeId in commentNodes) {
      commentNodes[nodeId].children.sort((a, b) => new Date(a.value.createdAt).getTime() - new Date(b.value.createdAt).getTime());
    }

    logger.info({ roots: rootComments.length, totalNodes: Object.keys(commentNodes).length }, "Successfully built comment tree.");
    return { __type: "BlogPostCommentTree", children: rootComments };
  }

  async setCommentHiddenStatus(
    commentId: CommentId,
    hide: boolean,
    staffUserId: UserId,
    providedExecutor: Drizzle = this.db
  ): Promise<BlogPostCommentTypeDTO | null> {
    const logger = this.logger.child({ fn: "setCommentHiddenStatus", commentId, hide, staffUserId });

    const operation = async (executor: Drizzle): Promise<BlogPostCommentTypeDTO | null> => {
      const staffUser = await this.userService.getById(staffUserId, executor);
      if (!staffUser || !staffUser.grants.comments.moderate) {
        logger.warn({ staffUserId }, "User not authorized to moderate comments or user not found.");
        throw new Error("User not authorized to perform this action.");
      }

      const commentUuid = CommentIds.toUUID(commentId);
      const updateValues: Partial<DBBlogPostComment> = {
        hiddenAt: hide ? new Date() : null,
        updatedAt: new Date(),
      };

      const [updatedDbComment] = await executor
        .update(BLOG_POST_COMMENTS)
        .set(updateValues)
        .where(eq(BLOG_POST_COMMENTS.commentUuid, commentUuid))
        .returning();

      if (!updatedDbComment) {
        logger.warn({ commentUuid }, "Comment not found for updating hidden status.");
        return null;
      }

      logger.info({ commentUuid, hidden: hide }, "Successfully updated comment hidden status.");

      // Fetch author and text content to return the full DTO
      const author = await this.userService.getByUserUUID(updatedDbComment.userUuid, executor);
      const textContent = await this.textService.getLatestTextById(TextIds.toRichId(updatedDbComment.textUuid), executor);

      if (!author || !textContent) {
        logger.error({ commentUuid, missingAuthor: !author, missingText: !textContent }, "Could not retrieve full details for updated comment.");
        // This is problematic as the comment *was* updated.
        // Return a partial DTO or throw, depending on strictness.
        // For now, let's indicate an issue by potentially returning null or a specific error.
        // However, the DB update succeeded.
        // Let's assume _toBlogPostCommentDTO can handle potentially missing pieces or throw if critical.
        // For now, we must have them.
        throw new Error("Failed to reconstruct comment DTO after update due to missing author or text.");
      }

      return this._toBlogPostCommentDTO(updatedDbComment, UserService.toPublic(author), textContent);
    };

    if (providedExecutor === this.db) {
      logger.debug("No external transaction, creating new one for setCommentHiddenStatus.");
      return this.db.transaction(async (tx) => {
        return operation(tx);
      });
    } else {
      logger.debug("External transaction executor provided, using it for setCommentHiddenStatus.");
      return operation(providedExecutor);
    }
  }
}