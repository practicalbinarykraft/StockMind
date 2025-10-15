import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
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
  title: text("title").notNull(),
  url: text("url").notNull(),
  content: text("content"), // Article content/description
  imageUrl: text("image_url"),
  aiScore: integer("ai_score"), // 0-100 virality score from AI
  aiComment: text("ai_comment"), // AI's comment on why this score
  publishedAt: timestamp("published_at"),
  parsedAt: timestamp("parsed_at").defaultNow().notNull(),
}, (table) => [
  index("rss_items_source_id_idx").on(table.sourceId),
  index("rss_items_ai_score_idx").on(table.aiScore),
]);

export const insertRssItemSchema = createInsertSchema(rssItems).omit({
  id: true,
  parsedAt: true,
});

export type InsertRssItem = z.infer<typeof insertRssItemSchema>;
export type RssItem = typeof rssItems.$inferSelect;

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
