CREATE TABLE "blog_post_comments" (
	"comment_uuid" uuid PRIMARY KEY NOT NULL,
	"sanity_blog_post_id" text NOT NULL,
	"user_uuid" uuid NOT NULL,
	"parent_comment_uuid" uuid,
	"text_uuid" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "blog_post_comments_text_uuid_unique" UNIQUE("text_uuid")
);
--> statement-breakpoint
CREATE TABLE "texts" (
	"text_uuid" uuid,
	"revision_uuid" uuid,
	"kind" text NOT NULL,
	"content_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_post_comments" ADD CONSTRAINT "blog_post_comments_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;