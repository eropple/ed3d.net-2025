CREATE SCHEMA "app_meta";
--> statement-breakpoint
CREATE TABLE "app_meta"."seeds" (
	"seed_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seeds_filename_unique" UNIQUE("filename")
);
