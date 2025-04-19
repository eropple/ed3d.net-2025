CREATE TABLE "blog_post_categories" (
	"blog_post_category_uuid" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "blog_post_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_post_content_items" (
	"blog_post_uuid" uuid PRIMARY KEY NOT NULL,
	"content_item_uuid" uuid NOT NULL,
	"author_uuid" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" jsonb NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "blog_post_content_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_post_tags" (
	"blog_post_tag_uuid" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "blog_post_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"content_item_uuid" uuid PRIMARY KEY NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "oidc_identity" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_post_content_items" ADD CONSTRAINT "blog_post_content_items_content_item_uuid_content_items_content_item_uuid_fk" FOREIGN KEY ("content_item_uuid") REFERENCES "public"."content_items"("content_item_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_content_items" ADD CONSTRAINT "blog_post_content_items_author_uuid_users_user_uuid_fk" FOREIGN KEY ("author_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE restrict ON UPDATE no action;