CREATE TABLE "user_sessions" (
	"session_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_uuid" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"username" text NOT NULL,
	"oidc_sub" text NOT NULL,
	"oidc_identity" jsonb,
	"last_accessed_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_oidc_sub_unique" UNIQUE("oidc_sub")
);
--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE cascade ON UPDATE no action;