-- Add favorites fields to rss_items table
ALTER TABLE "rss_items" ADD COLUMN IF NOT EXISTS "is_favorite" boolean DEFAULT false NOT NULL;
ALTER TABLE "rss_items" ADD COLUMN IF NOT EXISTS "favorited_at" timestamp;
ALTER TABLE "rss_items" ADD COLUMN IF NOT EXISTS "user_notes" text;
CREATE INDEX IF NOT EXISTS "rss_items_is_favorite_idx" ON "rss_items" USING btree ("is_favorite");
