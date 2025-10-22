import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
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
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// SESSION & USER TABLES (Required for Replit Auth)
// ============================================================================

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================================================
// API KEYS TABLE
// ============================================================================

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar("provider", { length: 50 }).notNull(), // 'openai', 'anthropic', 'elevenlabs', 'heygen', 'kieai'
  encryptedKey: text("encrypted_key").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("api_keys_user_id_idx").on(table.userId),
]);

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  userId: true,
  encryptedKey: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // We'll receive the plain key from frontend, encrypt on backend
  key: z.string().min(1, "API key is required"),
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

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
  content: text("content"), // Article content/description
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("instagram_sources_user_id_idx").on(table.userId),
]);

export const insertInstagramSourceSchema = createInsertSchema(instagramSources).omit({
  id: true,
  userId: true,
  lastParsed: true,
  parseStatus: true,
  parseError: true,
  itemCount: true,
  createdAt: true,
  updatedAt: true,
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
  videoUrl: text("video_url").notNull(), // Direct video URL
  thumbnailUrl: text("thumbnail_url"), // Thumbnail image
  videoDuration: integer("video_duration"), // Duration in seconds
  
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

// ============================================================================
// PROJECTS TABLE
// ============================================================================

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }),
  sourceType: varchar("source_type", { length: 20 }).notNull(), // 'news', 'custom', 'instagram', 'youtube', 'audio'
  sourceData: jsonb("source_data"), // Flexible storage for different source types
  currentStage: integer("current_stage").default(1).notNull(), // 1-7
  status: varchar("status", { length: 20 }).default('draft').notNull(), // 'draft', 'completed', 'deleted'
  deletedAt: timestamp("deleted_at"), // For 7-day recovery window
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("projects_user_id_idx").on(table.userId),
  index("projects_status_idx").on(table.status),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ============================================================================
// PROJECT STEPS TABLE (Saves progress through each stage)
// ============================================================================

export const projectSteps = pgTable("project_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  stepNumber: integer("step_number").notNull(), // 1-7
  data: jsonb("data"), // Flexible storage for step-specific data
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("project_steps_project_id_idx").on(table.projectId),
  uniqueIndex("project_steps_project_step_unique").on(table.projectId, table.stepNumber),
]);

export const insertProjectStepSchema = createInsertSchema(projectSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Allow completedAt to be a string (ISO date) and convert to Date
  completedAt: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : null), z.null()]).optional(),
});

export type InsertProjectStep = z.infer<typeof insertProjectStepSchema>;
export type ProjectStep = typeof projectSteps.$inferSelect;

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  rssSources: many(rssSources),
  instagramSources: many(instagramSources),
  projects: many(projects),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const rssSourcesRelations = relations(rssSources, ({ one, many }) => ({
  user: one(users, {
    fields: [rssSources.userId],
    references: [users.id],
  }),
  items: many(rssItems),
}));

export const rssItemsRelations = relations(rssItems, ({ one }) => ({
  source: one(rssSources, {
    fields: [rssItems.sourceId],
    references: [rssSources.id],
  }),
}));

export const instagramSourcesRelations = relations(instagramSources, ({ one }) => ({
  user: one(users, {
    fields: [instagramSources.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  steps: many(projectSteps),
}));

export const projectStepsRelations = relations(projectSteps, ({ one }) => ({
  project: one(projects, {
    fields: [projectSteps.projectId],
    references: [projects.id],
  }),
}));
