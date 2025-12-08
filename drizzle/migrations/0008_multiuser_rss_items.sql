-- Migration: Change rss_items unique constraint from (url) to (source_id, url)
-- Purpose: Allow multiple users to have the same article URL in their different sources

-- Drop the old global URL unique constraint
DROP INDEX IF EXISTS "rss_items_url_unique";
DROP INDEX IF EXISTS "idx_rss_items_url";

-- Create new composite unique index (source_id + url)
-- This allows the same URL to exist for different sources (multi-user support)
CREATE UNIQUE INDEX IF NOT EXISTS "rss_items_source_url_unique" ON "rss_items" ("source_id", "url");
