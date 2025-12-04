import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';

// ============================================================================
// INSTAGRAM SOURCES TABLE
// ============================================================================

export const instagramSources = pgTable("instagram_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  username: varchar("username", { length: 255 }).notNull(), // Instagram username (e.g. "techcrunch")
  profileUrl: text("profile_url"), // Full Instagram profile URL
  description: text("description"), // User-provided description
  isActive: boolean("is_active").default(true).notNull(),
  lastParsed: timestamp("last_parsed"),
  parseStatus: varchar("parse_status", { length: 20 }).default('pending'), // 'success', 'error', 'pending'
  parseError: text("parse_error"),
  itemCount: integer("item_count").default(0).notNull(), // Number of reels parsed

  // Smart parsing: track last scraped Reel to avoid duplicates and enable "new only" mode
  lastScrapedDate: timestamp("last_scraped_date"), // Date of last scraped Reel (for smart filtering)
  lastScrapedReelId: varchar("last_scraped_reel_id", { length: 255 }), // External ID of last scraped Reel

  // Auto-update settings (like RSS auto-parsing)
  autoUpdateEnabled: boolean("auto_update_enabled").default(true).notNull(),
  checkIntervalHours: integer("check_interval_hours").default(6).notNull(), // 6, 12, 24 hours

  // Monitoring status
  lastCheckedAt: timestamp("last_checked_at"), // Last time cron checked (regardless of success)
  lastSuccessfulParseAt: timestamp("last_successful_parse_at"), // Last successful parse
  nextCheckAt: timestamp("next_check_at"), // When to check next

  // Statistics
  totalChecks: integer("total_checks").default(0).notNull(), // How many times checked
  newReelsFound: integer("new_reels_found").default(0).notNull(), // Total new Reels found by auto-update
  failedChecks: integer("failed_checks").default(0).notNull(), // Failed check count

  // Notification settings
  notifyNewReels: boolean("notify_new_reels").default(true).notNull(), // Notify about new Reels
  notifyViralOnly: boolean("notify_viral_only").default(false).notNull(), // Only notify viral
  viralThreshold: integer("viral_threshold").default(100000).notNull(), // 100k views = viral

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("instagram_sources_user_id_idx").on(table.userId),
  index("instagram_sources_next_check_idx").on(table.nextCheckAt),
]);

export const insertInstagramSourceSchema = createInsertSchema(instagramSources).omit({
  id: true,
  userId: true,
  lastParsed: true,
  parseStatus: true,
  parseError: true,
  itemCount: true,
  lastScrapedDate: true,
  lastScrapedReelId: true,
  lastCheckedAt: true,
  lastSuccessfulParseAt: true,
  nextCheckAt: true,
  totalChecks: true,
  newReelsFound: true,
  failedChecks: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Allow optional auto-update settings during creation
  autoUpdateEnabled: z.boolean().optional(),
  checkIntervalHours: z.number().optional(),
  notifyNewReels: z.boolean().optional(),
  notifyViralOnly: z.boolean().optional(),
  viralThreshold: z.number().optional(),
});

export type InsertInstagramSource = z.infer<typeof insertInstagramSourceSchema>;
export type InstagramSource = typeof instagramSources.$inferSelect;

// ============================================================================
// INSTAGRAM ITEMS TABLE (Scraped Instagram Reels)
// ============================================================================

export const instagramItems = pgTable("instagram_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull().references(() => instagramSources.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Instagram metadata
  externalId: varchar("external_id", { length: 255 }).notNull(), // Instagram post ID or shortCode
  shortCode: varchar("short_code", { length: 255 }), // Instagram shortCode
  caption: text("caption"), // Reel caption/description
  url: text("url").notNull(), // Instagram Reel URL
  videoUrl: text("video_url").notNull(), // Direct video URL from Apify
  thumbnailUrl: text("thumbnail_url"), // Thumbnail image URL from Apify
  videoDuration: integer("video_duration"), // Duration in seconds

  // Local storage (critical for transcription - Apify URLs expire in 24-48h!)
  localVideoPath: text("local_video_path"), // /uploads/instagram-reels/{id}.mp4
  localThumbnailPath: text("local_thumbnail_path"), // /uploads/instagram-reels/{id}.jpg
  downloadStatus: varchar("download_status", { length: 20 }).default('pending'), // pending/downloading/completed/failed
  downloadError: text("download_error"), // Error message if download failed

  // Transcription (Phase 5)
  transcriptionText: text("transcription_text"), // Transcribed text from video
  transcriptionStatus: varchar("transcription_status", { length: 20 }).default('pending'), // pending/processing/completed/failed
  transcriptionError: text("transcription_error"), // Error message if transcription failed
  language: varchar("language", { length: 10 }), // Detected language (e.g., 'ru', 'en')

  // Engagement metrics
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  videoViewCount: integer("video_view_count").default(0),
  videoPlayCount: integer("video_play_count").default(0),
  sharesCount: integer("shares_count").default(0),

  // Content metadata
  hashtags: text("hashtags").array(), // Array of hashtags
  mentions: text("mentions").array(), // Array of @mentions

  // Owner information
  ownerUsername: varchar("owner_username", { length: 255 }),
  ownerFullName: varchar("owner_full_name", { length: 255 }),
  ownerId: varchar("owner_id", { length: 255 }),

  // Music info (stored as JSONB)
  musicInfo: jsonb("music_info"), // { artist, songName, originalAudio }

  // AI scoring (similar to RSS items)
  aiScore: integer("ai_score"), // 0-100 virality score from AI
  aiComment: text("ai_comment"), // AI's comment on why this score

  // User interaction tracking
  userAction: varchar("user_action", { length: 20 }), // 'selected', 'dismissed', 'seen', null
  actionAt: timestamp("action_at"), // When user performed action
  usedInProject: varchar("used_in_project"), // Project ID if used

  // Detailed scoring (for future AI scoring)
  freshnessScore: integer("freshness_score"), // 0-100 based on time
  viralityScore: integer("virality_score"), // 0-100 trending potential
  qualityScore: integer("quality_score"), // 0-100 content quality

  // Timestamps
  publishedAt: timestamp("published_at"), // When posted on Instagram
  parsedAt: timestamp("parsed_at").defaultNow().notNull(), // When scraped by us
}, (table) => [
  index("instagram_items_source_id_idx").on(table.sourceId),
  index("instagram_items_user_id_idx").on(table.userId),
  index("instagram_items_external_id_idx").on(table.externalId),
  index("instagram_items_ai_score_idx").on(table.aiScore),
  index("instagram_items_user_action_idx").on(table.userAction),
  index("instagram_items_published_at_idx").on(table.publishedAt),
  // Prevent duplicate Reels for same user
  uniqueIndex("instagram_items_user_external_id_unique").on(table.userId, table.externalId),
]);

export const insertInstagramItemSchema = createInsertSchema(instagramItems).omit({
  id: true,
  parsedAt: true,
});

export type InsertInstagramItem = z.infer<typeof insertInstagramItemSchema>;
export type InstagramItem = typeof instagramItems.$inferSelect;
