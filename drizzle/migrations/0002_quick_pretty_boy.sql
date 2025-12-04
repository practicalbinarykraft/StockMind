ALTER TABLE "rss_items" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rss_items" ADD COLUMN "favorited_at" timestamp;--> statement-breakpoint
ALTER TABLE "rss_items" ADD COLUMN "user_notes" text;--> statement-breakpoint
CREATE INDEX "rss_items_is_favorite_idx" ON "rss_items" USING btree ("is_favorite");