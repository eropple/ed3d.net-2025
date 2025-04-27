CREATE SCHEMA "app_meta";
--> statement-breakpoint
CREATE TYPE "public"."social_oauth2_provider_kind" AS ENUM('github', 'google');--> statement-breakpoint
CREATE TYPE "public"."user_link_types" AS ENUM('login', 'verify');--> statement-breakpoint
CREATE TABLE "atproto_sessions" (
	"key" text PRIMARY KEY NOT NULL,
	"session_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "atproto_states" (
	"key" text PRIMARY KEY NOT NULL,
	"state_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_uuid" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"token_salt" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_atproto_identities" (
	"user_atproto_identity_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"did" text NOT NULL,
	"handle" text NOT NULL,
	"profile_data" jsonb NOT NULL,
	"access_token" jsonb NOT NULL,
	"refresh_token" jsonb,
	"last_refreshed_at" timestamp with time zone,
	"provider_metadata" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "user_atproto_identities_did_unique" UNIQUE("did")
);
--> statement-breakpoint
CREATE TABLE "user_email_links" (
	"user_email_link_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"type" "user_link_types" NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"session_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_social_oauth2_identities" (
	"user_social_o_auth2_identity_uuid" uuid PRIMARY KEY NOT NULL,
	"user_uuid" uuid NOT NULL,
	"provider" "social_oauth2_provider_kind" NOT NULL,
	"provider_id" text NOT NULL,
	"provider_username" text NOT NULL,
	"access_token" jsonb NOT NULL,
	"refresh_token" jsonb,
	"last_refreshed_at" timestamp with time zone,
	"provider_metadata" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_meta"."seeds" (
	"seed_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seeds_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
ALTER TABLE "user_atproto_identities" ADD CONSTRAINT "user_atproto_identities_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_email_links" ADD CONSTRAINT "user_email_links_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_social_oauth2_identities" ADD CONSTRAINT "user_social_oauth2_identities_user_uuid_users_user_uuid_fk" FOREIGN KEY ("user_uuid") REFERENCES "public"."users"("user_uuid") ON DELETE no action ON UPDATE no action;