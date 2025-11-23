import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { projects } from './projects';
import { scriptVersions } from './script-versions';

// ============================================================================
// INSTAGRAM ANALYTICS TABLES (Connected accounts, media, insights, bindings)
// ============================================================================

// Instagram connected accounts (via Facebook OAuth)
export const igAccounts = pgTable("ig_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Facebook/Instagram identifiers
  fbUserId: varchar("fb_user_id").notNull(), // Facebook user ID
  fbPageId: varchar("fb_page_id").notNull(), // Connected Facebook Page ID
  igUserId: varchar("ig_user_id").notNull(), // Instagram Business/Creator account ID
  igUsername: varchar("ig_username", { length: 255 }), // Instagram username for display

  // Token management
  accessTokenEncrypted: text("access_token_encrypted").notNull(), // Long-Lived User Token (encrypted with AES-256)
  tokenExpiresAt: timestamp("token_expires_at").notNull(), // Token expiration (typically 60 days)

  // Account status
  accountStatus: varchar("account_status", { length: 20 }).default('active').notNull(), // 'active' | 'auth_error' | 'disconnected'
  lastError: text("last_error"), // Last authentication/sync error message

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("ig_accounts_user_id_idx").on(table.userId),
  index("ig_accounts_ig_user_id_idx").on(table.igUserId),
]);

export const insertIgAccountSchema = createInsertSchema(igAccounts).omit({
  id: true,
  userId: true,
  accessTokenEncrypted: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIgAccount = z.infer<typeof insertIgAccountSchema>;
export type IgAccount = typeof igAccounts.$inferSelect;

// Instagram media posts (Reels, Videos, etc.)
export const igMedia = pgTable("ig_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  igAccountId: varchar("ig_account_id").notNull().references(() => igAccounts.id, { onDelete: 'cascade' }),

  // Graph API identifiers
  igMediaId: varchar("ig_media_id").notNull(), // Instagram media ID from Graph API (composite unique with igAccountId)
  permalink: text("permalink").notNull(), // Public URL to the post

  // Media metadata
  mediaType: varchar("media_type", { length: 20 }).default('REEL').notNull(), // 'REEL' | 'VIDEO' | 'IMAGE' | 'CAROUSEL_ALBUM'
  caption: text("caption"),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: timestamp("published_at").notNull(),

  // Sync scheduling
  lastSyncedAt: timestamp("last_synced_at"), // Last successful insights fetch
  nextSyncAt: timestamp("next_sync_at"), // When to fetch insights next
  syncStatus: varchar("sync_status", { length: 20 }).default('idle').notNull(), // 'idle' | 'queued' | 'syncing' | 'ok' | 'error' | 'rate_limited'
  syncError: text("sync_error"), // Last sync error message

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("ig_media_account_id_idx").on(table.igAccountId),
  index("ig_media_published_at_idx").on(table.publishedAt),
  index("ig_media_next_sync_idx").on(table.nextSyncAt),
  index("ig_media_sync_status_idx").on(table.syncStatus),
  // Prevent cross-user overwrites: same IG media ID can exist for different accounts
  uniqueIndex("ig_media_account_media_unique").on(table.igAccountId, table.igMediaId),
]);

export const insertIgMediaSchema = createInsertSchema(igMedia).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIgMedia = z.infer<typeof insertIgMediaSchema>;
export type IgMedia = typeof igMedia.$inferSelect;

// Instagram media insights (metrics snapshots over time)
export const igMediaInsights = pgTable("ig_media_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  igMediaId: varchar("ig_media_id").notNull().references(() => igMedia.id, { onDelete: 'cascade' }),

  collectedAt: timestamp("collected_at").defaultNow().notNull(), // When this snapshot was collected

  // Flexible metrics storage (adapts to Graph API changes)
  metrics: jsonb("metrics").notNull(), // { plays: 1234, reach: 5678, impressions: 9012, likes: 345, comments: 67, saves: 89, shares: 12, ... }
  raw: jsonb("raw"), // Full raw response from Graph API for future extensibility

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ig_media_insights_media_id_idx").on(table.igMediaId),
  index("ig_media_insights_collected_at_idx").on(table.collectedAt),
]);

export const insertIgMediaInsightSchema = createInsertSchema(igMediaInsights).omit({
  id: true,
  createdAt: true,
});

export type InsertIgMediaInsight = z.infer<typeof insertIgMediaInsightSchema>;
export type IgMediaInsight = typeof igMediaInsights.$inferSelect;

// Project version to Instagram post bindings (for predicted vs actual comparison)
export const projectVersionBindings = pgTable("project_version_bindings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  versionId: varchar("version_id").notNull().references(() => scriptVersions.id, { onDelete: 'cascade' }),
  igMediaId: varchar("ig_media_id").notNull().references(() => igMedia.id, { onDelete: 'cascade' }),

  bindType: varchar("bind_type", { length: 20 }).default('manual').notNull(), // 'manual' | 'tagged' | 'auto'

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("project_version_bindings_project_idx").on(table.projectId),
  index("project_version_bindings_version_idx").on(table.versionId),
  index("project_version_bindings_media_idx").on(table.igMediaId),
  uniqueIndex("uniq_version_binding").on(table.versionId), // One post per version
]);

export const insertProjectVersionBindingSchema = createInsertSchema(projectVersionBindings).omit({
  id: true,
  createdAt: true,
});

export type InsertProjectVersionBinding = z.infer<typeof insertProjectVersionBindingSchema>;
export type ProjectVersionBinding = typeof projectVersionBindings.$inferSelect;
