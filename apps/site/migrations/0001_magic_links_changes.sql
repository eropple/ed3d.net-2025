CREATE TABLE "magic_links" (
	"magic_link_uuid" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"type" "user_link_types" NOT NULL,
	"token" text NOT NULL,
	"user_uuid" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DROP TABLE "user_email_links" CASCADE;--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "magic_links_token_idx" ON "magic_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "magic_links_user_idx" ON "magic_links" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "magic_links_unused_idx" ON "magic_links" USING btree ("used_at","expires_at");