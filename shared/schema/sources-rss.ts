import { sql } from 'drizzle-orm';
import {
  index,
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
// RSS SOURCES TABLE
// ============================================================================

export const rssSources = pgTable("rss_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  topic: varchar("topic", { length: 100 }), // 'AI & Tech', 'Business', 'Entertainment', etc.
  isActive: boolean("is_active").default(true).notNull(),
  lastParsed: timestamp("last_parsed"),
  parseStatus: varchar("parse_status", { length: 20 }).default('pending'), // 'success', 'error', 'pending'
  parseError: text("parse_error"),
  itemCount: integer("item_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("rss_sources_user_id_idx").on(table.userId),
]);

export const insertRssSourceSchema = createInsertSchema(rssSources).omit({
  id: true,
  userId: true,
  lastParsed: true,
  parseStatus: true,
  parseError: true,
  itemCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRssSource = z.infer<typeof insertRssSourceSchema>;
export type RssSource = typeof rssSources.$inferSelect;

// ============================================================================
// RSS ITEMS TABLE (Parsed news articles)
// ============================================================================

export const rssItems = pgTable("rss_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull().references(() => rssSources.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }), // Added for user-specific actions
  title: text("title").notNull(),
  url: text("url").notNull(),
  content: text("content"), // Article content/description from RSS (short)
  fullContent: text("full_content"), // Full article text extracted from URL via web scraping
  lastFetchedAt: timestamp("last_fetched_at"), // When full content was last extracted
  imageUrl: text("image_url"),
  aiScore: integer("ai_score"), // 0-100 virality score from AI (Stage 1 selection score)
  aiComment: text("ai_comment"), // AI's comment on why this score

  // User interaction tracking
  userAction: varchar("user_action", { length: 20 }), // 'selected', 'dismissed', 'seen', null
  actionAt: timestamp("action_at"), // When user performed action
  usedInProject: varchar("used_in_project"), // Project ID if used

  // Detailed scoring (for future AI scoring)
  freshnessScore: integer("freshness_score"), // 0-100 based on time
  viralityScore: integer("virality_score"), // 0-100 trending potential
  qualityScore: integer("quality_score"), // 0-100 source quality

  publishedAt: timestamp("published_at"),
  parsedAt: timestamp("parsed_at").defaultNow().notNull(),
}, (table) => [
  index("rss_items_source_id_idx").on(table.sourceId),
  index("rss_items_user_id_idx").on(table.userId),
  index("rss_items_ai_score_idx").on(table.aiScore),
  index("rss_items_user_action_idx").on(table.userAction),
  index("rss_items_published_at_idx").on(table.publishedAt),
]);

export const insertRssItemSchema = createInsertSchema(rssItems).omit({
  id: true,
  parsedAt: true,
});

export type InsertRssItem = z.infer<typeof insertRssItemSchema>;
export type RssItem = typeof rssItems.$inferSelect;
