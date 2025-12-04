import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { projects } from './projects';

// ============================================================================
// POST ANALYTICS TABLE
// ============================================================================

export const postAnalytics = pgTable("post_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Платформа и ссылка
  platform: varchar("platform", { length: 50 }).notNull(), // instagram, tiktok, youtube
  postUrl: text("post_url").notNull(),
  postId: varchar("post_id", { length: 255 }), // ID поста на платформе
  
  // Настройки парсинга
  updateIntervalHours: integer("update_interval_hours").default(6).notNull(),
  trackingDays: integer("tracking_days").default(30).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastFetchedAt: timestamp("last_fetched_at"),
  nextFetchAt: timestamp("next_fetch_at"),
  trackingEndsAt: timestamp("tracking_ends_at"),
  
  // Статус
  status: varchar("status", { length: 50 }).default('pending').notNull(), // pending, active, paused, expired, error
  lastError: text("last_error"),
}, (table) => [
  index("post_analytics_project_idx").on(table.projectId),
  index("post_analytics_user_idx").on(table.userId),
  index("post_analytics_status_idx").on(table.status),
  index("post_analytics_next_fetch_idx").on(table.nextFetchAt),
]);

// ============================================================================
// ANALYTICS SNAPSHOTS TABLE (История метрик)
// ============================================================================

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analyticsId: varchar("analytics_id").notNull().references(() => postAnalytics.id, { onDelete: 'cascade' }),
  
  // Метрики
  views: integer("views"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  saves: integer("saves"),
  
  // Дополнительные метрики (платформо-зависимые)
  reach: integer("reach"), // Instagram
  impressions: integer("impressions"), // Instagram
  plays: integer("plays"), // TikTok/Reels
  watchTimeSeconds: integer("watch_time_seconds"), // YouTube
  
  // Рассчитанные метрики
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }),
  
  // Timestamp
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
}, (table) => [
  index("analytics_snapshots_analytics_idx").on(table.analyticsId),
  index("analytics_snapshots_time_idx").on(table.analyticsId, table.fetchedAt),
]);

// ============================================================================
// ANALYTICS FETCH QUEUE TABLE (Очередь задач для Apify)
// ============================================================================

export const analyticsFetchQueue = pgTable("analytics_fetch_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analyticsId: varchar("analytics_id").notNull().references(() => postAnalytics.id, { onDelete: 'cascade' }),
  
  status: varchar("status", { length: 50 }).default('pending').notNull(), // pending, processing, completed, failed
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Результат
  apifyRunId: varchar("apify_run_id", { length: 255 }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
}, (table) => [
  index("analytics_queue_status_idx").on(table.status, table.scheduledAt),
  index("analytics_queue_analytics_idx").on(table.analyticsId),
]);

export const insertPostAnalyticsSchema = createInsertSchema(postAnalytics).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertPostAnalytics = z.infer<typeof insertPostAnalyticsSchema>;
export type PostAnalytics = typeof postAnalytics.$inferSelect;

export const insertAnalyticsSnapshotSchema = createInsertSchema(analyticsSnapshots).omit({
  id: true,
  fetchedAt: true,
});

export type InsertAnalyticsSnapshot = z.infer<typeof insertAnalyticsSnapshotSchema>;
export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;

