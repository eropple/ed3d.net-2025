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
    return {
      __type: "BlogPostComment",
      commentId: CommentIds.toRichId(dbComment.commentUuid),
      blogPostId: dbComment.sanityBlogPostId,
      author: author,
      textContent: textContent,
      parentCommentId: dbComment.parentCommentUuid ? CommentIds.toRichId(dbComment.parentCommentUuid) : undefined,
      createdAt: dbComment.createdAt,
      updatedAt: dbComment.updatedAt ?? undefined,
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
      const createdText = await this.textService.createText(
        params.textContent,
        executor
      );

      if (!createdText) {
        logger.error("Text creation returned unexpectedly undefined.");
        throw new Error("Failed to create text content for comment.");
      }

      const authorPrivate = await this.userService.getById(params.authorUserId, executor);
      if (!authorPrivate) {
        logger.error({ authorUserId: params.authorUserId }, "Author not found.");
        throw new Error("Author not found.");
      }
      const authorPublic = UserService.toPublic(authorPrivate);

      const parentCommentUuid = params.parentCommentId ? CommentIds.toUUID(params.parentCommentId) : null;
      logger.debug({
        parentCommentId: params.parentCommentId,
        parentCommentUuid: parentCommentUuid
      }, "Parent ID processing for DB insert");

      const [dbComment] = await executor
        .insert(BLOG_POST_COMMENTS)
        .values({
          sanityBlogPostId: params.blogPostId,
          userUuid: UserIds.toUUID(params.authorUserId),
          textUuid: TextIds.toUUID(createdText.textId),
          parentCommentUuid: parentCommentUuid,
        })
        .returning();

      if (!dbComment) {
        logger.error("Failed to insert comment into database.");
        throw new Error("Failed to create comment.");
      }

      logger.info({ commentId: dbComment.commentUuid, textId: createdText.textId }, "Successfully added new comment.");
      return this._toBlogPostCommentDTO(dbComment, authorPublic, createdText);
    };

    if (providedExecutor === this.db) {
      logger.debug("No external transaction provided for addComment, creating a new one.");
      return this.db.transaction(async (tx) => {
        return operation(tx);
      });
    } else {
      logger.debug("External transaction executor provided for addComment, using it directly.");
      return operation(providedExecutor);
    }
  }

  async getCommentsForPost(
    blogPostId: string, // This is the sanityBlogPostId
    executor: DrizzleRO = this.dbRO,
  ): Promise<BlogPostCommentTree> {
    const logger = this.logger.child({ fn: "getCommentsForPost", blogPostId });
    logger.debug("Fetching comments for blog post");

    const dbComments = await executor
      .select()
      .from(BLOG_POST_COMMENTS)
      .where(eq(BLOG_POST_COMMENTS.sanityBlogPostId, blogPostId))
      .orderBy(BLOG_POST_COMMENTS.createdAt);

    if (!dbComments || dbComments.length === 0) {
      logger.debug("No comments found for blog post, returning empty tree.");
      return { __type: "BlogPostCommentTree", children: [] };
    }

    const commentDTOPromises = dbComments.map(async (dbComment) => {
      const textContent = await this.textService.getLatestTextById(
        TextIds.toRichId(dbComment.textUuid),
        executor,
      );
      // Ensure userUuid is used as per DB schema for BLOG_POST_COMMENTS
      const authorPrivate = await this.userService.getByUserUUID(dbComment.userUuid, executor);

      if (!textContent) {
        logger.error({ textUuid: dbComment.textUuid, commentUuid: dbComment.commentUuid }, "Text content not found for comment. Skipping this comment.");
        return null;
      }
      if (!authorPrivate) {
        logger.error({ authorUserUuid: dbComment.userUuid, commentUuid: dbComment.commentUuid }, "Author not found for comment. Skipping this comment.");
        return null;
      }
      const authorPublic = UserService.toPublic(authorPrivate);

      return this._toBlogPostCommentDTO(dbComment, authorPublic, textContent);
    });

    const resolvedCommentDTOs = (await Promise.all(commentDTOPromises)).filter(
      (dto): dto is BlogPostCommentTypeDTO => dto !== null,
    );

    // Build the tree structure
    const commentsById: Map<string, BlogPostCommentNode> = new Map();
    const rootNodes: BlogPostCommentNode[] = [];

    // Initialize all nodes
    for (const dto of resolvedCommentDTOs) {
      commentsById.set(dto.commentId, {
        __type: "BlogPostCommentNode",
        value: dto,
        children: [],
      });
    }

    // Link children to their parents
    for (const dto of resolvedCommentDTOs) {
      const node = commentsById.get(dto.commentId);
      if (!node) continue;

      if (dto.parentCommentId) {
        const parentNode = commentsById.get(dto.parentCommentId);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          logger.warn({ commentId: dto.commentId, parentCommentId: dto.parentCommentId }, "Parent comment not found for child, adding child as a root node.");
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    }

    // Sort children by createdAt date to ensure chronological order within siblings
    commentsById.forEach(node => {
      node.children.sort((a, b) => a.value.createdAt.getTime() - b.value.createdAt.getTime());
    });
    // Also sort root nodes
    rootNodes.sort((a,b) => a.value.createdAt.getTime() - b.value.createdAt.getTime());

    logger.debug({ blogPostId, commentCount: resolvedCommentDTOs.length, rootNodeCount: rootNodes.length }, "Successfully fetched and structured comments.");
    return {
      __type: "BlogPostCommentTree",
      children: rootNodes,
    };
  }
}