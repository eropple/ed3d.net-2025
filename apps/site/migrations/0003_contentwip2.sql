CREATE TABLE "blog_posts_to_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"blog_post_uuid" uuid NOT NULL,
	"blog_post_category_uuid" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "blog_posts_to_categories_blog_post_uuid_blog_post_category_uuid_unique" UNIQUE("blog_post_uuid","blog_post_category_uuid")
);
--> statement-breakpoint
CREATE TABLE "blog_posts_to_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"blog_post_uuid" uuid NOT NULL,
	"blog_post_tag_uuid" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "blog_posts_to_tags_blog_post_uuid_blog_post_tag_uuid_unique" UNIQUE("blog_post_uuid","blog_post_tag_uuid")
);
--> statement-breakpoint
ALTER TABLE "blog_posts_to_categories" ADD CONSTRAINT "blog_posts_to_categories_blog_post_uuid_blog_post_content_items_blog_post_uuid_fk" FOREIGN KEY ("blog_post_uuid") REFERENCES "public"."blog_post_content_items"("blog_post_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts_to_categories" ADD CONSTRAINT "blog_posts_to_categories_blog_post_category_uuid_blog_post_categories_blog_post_category_uuid_fk" FOREIGN KEY ("blog_post_category_uuid") REFERENCES "public"."blog_post_categories"("blog_post_category_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts_to_tags" ADD CONSTRAINT "blog_posts_to_tags_blog_post_uuid_blog_post_content_items_blog_post_uuid_fk" FOREIGN KEY ("blog_post_uuid") REFERENCES "public"."blog_post_content_items"("blog_post_uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts_to_tags" ADD CONSTRAINT "blog_posts_to_tags_blog_post_tag_uuid_blog_post_tags_blog_post_tag_uuid_fk" FOREIGN KEY ("blog_post_tag_uuid") REFERENCES "public"."blog_post_tags"("blog_post_tag_uuid") ON DELETE cascade ON UPDATE no action;