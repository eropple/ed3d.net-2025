import { relations } from "drizzle-orm";
import { pgTable, serial, integer, uuid, timestamp, text, boolean, jsonb, unique } from "drizzle-orm/pg-core";
import { ulid, ulidToUUID } from "ulidx";

import { type StringUUID } from "../../../ext/typebox/index.js";
import type { RawOIDCIdentity } from "../../domain/auth/types.js";
import type { TextEnvelope } from "../../domain/text/types.js";


export const ULIDAsUUID = (columnName?: string) =>
  (columnName ? uuid(columnName) : uuid())
    .$default(() => ulidToUUID(ulid()))
    .$type<StringUUID>();

// ---------- MIXINS ---------------------- //
export const TIMESTAMPS_MIXIN = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }).$onUpdateFn(() => new Date()),
};

export const S3_LOCATOR_MIXIN = {
  bucket: text("bucket").notNull(),
  objectName: text("object_name").notNull(),
};

export const users = pgTable("users", {
  userUuid: ULIDAsUUID("user_uuid").primaryKey(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").default(false),
  username: text("username").notNull().unique(),
  oidcSub: text("oidc_sub").notNull().unique(),
  oidcIdentity: jsonb("oidc_identity").$type<RawOIDCIdentity>().notNull(),

  lastAccessedAt: timestamp("last_accessed_at", {
    withTimezone: true,
    mode: "date"
  }),
  disabledAt: timestamp("disabled_at", {
    withTimezone: true,
    mode: "date"
  }),

  ...TIMESTAMPS_MIXIN,
});

export type DBUser = typeof users.$inferSelect;
export type DBNewUser = typeof users.$inferInsert;

export const userSessions = pgTable("user_sessions", {
  sessionUuid: ULIDAsUUID("session_uuid").primaryKey(),
  userUuid: ULIDAsUUID("user_uuid")
    .notNull()
    .references(() => users.userUuid, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  lastAccessedAt: timestamp("last_accessed_at", {
    withTimezone: true,
    mode: "date"
  })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", {
    withTimezone: true,
    mode: "date"
  }),

  ...TIMESTAMPS_MIXIN,
});

export type DBUserSession = typeof userSessions.$inferSelect;
export type DBNewUserSession = typeof userSessions.$inferInsert;

export const contentItems = pgTable("content_items", {
  contentItemUuid: ULIDAsUUID("content_item_uuid").primaryKey(),

  publishedAt: timestamp("published_at", {
    withTimezone: true,
    mode: "date"
  }).notNull(),

  ...TIMESTAMPS_MIXIN,
});

export type DBContentItem = typeof contentItems.$inferSelect;
export type DBNewContentItem = typeof contentItems.$inferInsert;

export const blogPostCategories = pgTable("blog_post_categories", {
  blogPostCategoryUuid: ULIDAsUUID("blog_post_category_uuid").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  ...TIMESTAMPS_MIXIN,
});

export type DBBlogPostCategory = typeof blogPostCategories.$inferSelect;
export type DBNewBlogPostCategory = typeof blogPostCategories.$inferInsert;

export const blogPostTags = pgTable("blog_post_tags", {
  blogPostTagUuid: ULIDAsUUID("blog_post_tag_uuid").primaryKey(),
  slug: text("slug").notNull().unique(),

  ...TIMESTAMPS_MIXIN,
});

export type DBBlogPostTag = typeof blogPostTags.$inferSelect;
export type DBNewBlogPostTag = typeof blogPostTags.$inferInsert;

export const blogPostContentItems = pgTable("blog_post_content_items", {
  blogPostUuid: ULIDAsUUID("blog_post_uuid").primaryKey(),
  contentItemUuid: ULIDAsUUID("content_item_uuid")
    .notNull()
    .references(() => contentItems.contentItemUuid, { onDelete: "cascade" }),

  authorUuid: ULIDAsUUID("author_uuid")
    .notNull()
    .references(() => users.userUuid, { onDelete: "restrict" }),

  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),

  description: jsonb("description").$type<TextEnvelope & { intent: "blurb" }>().notNull(),
  liveRevisionUuid: ULIDAsUUID("live_revision_uuid"),

  ...TIMESTAMPS_MIXIN,
});

export const blogPostContentRevisions = pgTable("blog_post_content_revisions", {
  revisionUuid: ULIDAsUUID("revision_uuid").primaryKey(),
  blogPostUuid: ULIDAsUUID("blog_post_uuid")
    .notNull()
    .references(() => blogPostContentItems.blogPostUuid, { onDelete: "cascade" }),
  creatorUuid: ULIDAsUUID("creator_uuid")
    .notNull()
    .references(() => users.userUuid, { onDelete: "restrict" }),
  content: jsonb("content").$type<TextEnvelope & { intent: "longform" }>().notNull(),

  ...TIMESTAMPS_MIXIN,
});

export const blogPostsToCategories = pgTable("blog_posts_to_categories", {
  id: serial("id").primaryKey(),
  blogPostUuid: ULIDAsUUID("blog_post_uuid")
    .notNull()
    .references(() => blogPostContentItems.blogPostUuid, { onDelete: "cascade" }),
  blogPostCategoryUuid: ULIDAsUUID("blog_post_category_uuid")
    .notNull()
    .references(() => blogPostCategories.blogPostCategoryUuid, { onDelete: "cascade" }),

  ...TIMESTAMPS_MIXIN,
}, (t) => ({
  unq: unique().on(t.blogPostUuid, t.blogPostCategoryUuid),
}));

export const blogPostsToTags = pgTable("blog_posts_to_tags", {
  id: serial("id").primaryKey(),
  blogPostUuid: ULIDAsUUID("blog_post_uuid")
    .notNull()
    .references(() => blogPostContentItems.blogPostUuid, { onDelete: "cascade" }),
  blogPostTagUuid: ULIDAsUUID("blog_post_tag_uuid")
    .notNull()
    .references(() => blogPostTags.blogPostTagUuid, { onDelete: "cascade" }),

  ...TIMESTAMPS_MIXIN,
}, (t) => ({
  unq: unique().on(t.blogPostUuid, t.blogPostTagUuid),
}));

export const blogPostContentItemsRelations = relations(blogPostContentItems, ({ many, one }) => ({
  contentItem: one(contentItems, {
    fields: [blogPostContentItems.contentItemUuid],
    references: [contentItems.contentItemUuid],
  }),
  author: one(users, {
    fields: [blogPostContentItems.authorUuid],
    references: [users.userUuid],
  }),
  categories: many(blogPostsToCategories, {
    relationName: "blogPostToCategories",
  }),
  tags: many(blogPostsToTags, {
    relationName: "blogPostToTags",
  }),
  revisions: many(blogPostContentRevisions),
  liveRevision: one(blogPostContentRevisions, {
    fields: [blogPostContentItems.liveRevisionUuid],
    references: [blogPostContentRevisions.revisionUuid],
  }),
}));

export const blogPostContentRevisionsRelations = relations(blogPostContentRevisions, ({ one }) => ({
  blogPost: one(blogPostContentItems, {
    fields: [blogPostContentRevisions.blogPostUuid],
    references: [blogPostContentItems.blogPostUuid],
  }),
  creator: one(users, {
    fields: [blogPostContentRevisions.creatorUuid],
    references: [users.userUuid],
  }),
}));

export const blogPostsToCategoriesRelations = relations(blogPostsToCategories, ({ one }) => ({
  blogPost: one(blogPostContentItems, {
    fields: [blogPostsToCategories.blogPostUuid],
    references: [blogPostContentItems.blogPostUuid],
    relationName: "blogPostToCategories",
  }),
  category: one(blogPostCategories, {
    fields: [blogPostsToCategories.blogPostCategoryUuid],
    references: [blogPostCategories.blogPostCategoryUuid],
    relationName: "categoryToBlogPosts",
  }),
}));

export const blogPostsToTagsRelations = relations(blogPostsToTags, ({ one }) => ({
  blogPost: one(blogPostContentItems, {
    fields: [blogPostsToTags.blogPostUuid],
    references: [blogPostContentItems.blogPostUuid],
    relationName: "blogPostToTags",
  }),
  tag: one(blogPostTags, {
    fields: [blogPostsToTags.blogPostTagUuid],
    references: [blogPostTags.blogPostTagUuid],
    relationName: "tagToBlogPosts",
  }),
}));

export const blogPostCategoriesRelations = relations(blogPostCategories, ({ many }) => ({
  blogPosts: many(blogPostsToCategories, {
    relationName: "categoryToBlogPosts",
  }),
}));

export const blogPostTagsRelations = relations(blogPostTags, ({ many }) => ({
  blogPosts: many(blogPostsToTags, {
    relationName: "tagToBlogPosts",
  }),
}));

export type DBBlogPostContentItem = typeof blogPostContentItems.$inferSelect;
export type DBNewBlogPostContentItem = typeof blogPostContentItems.$inferInsert;

export type DBBlogPostContentRevision = typeof blogPostContentRevisions.$inferSelect;
export type DBNewBlogPostContentRevision = typeof blogPostContentRevisions.$inferInsert;

export type DBBlogPostToCategory = typeof blogPostsToCategories.$inferSelect;
export type DBNewBlogPostToCategory = typeof blogPostsToCategories.$inferInsert;

export type DBBlogPostToTag = typeof blogPostsToTags.$inferSelect;
export type DBNewBlogPostToTag = typeof blogPostsToTags.$inferInsert;