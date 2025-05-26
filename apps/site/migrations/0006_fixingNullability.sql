ALTER TABLE "texts" ADD PRIMARY KEY ("text_uuid");--> statement-breakpoint
ALTER TABLE "texts" ALTER COLUMN "text_uuid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "texts" ALTER COLUMN "revision_uuid" SET NOT NULL;