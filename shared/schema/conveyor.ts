import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { projects } from './projects';

// ============================================================================
// CONVEYOR SETTINGS TABLE
// User's auto-agent configuration
// ============================================================================

export const conveyorSettings = pgTable("conveyor_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  // === Enabled ===
  enabled: boolean("enabled").default(false).notNull(),

  // === Scout settings ===
  sourceTypes: jsonb("source_types").default(['news']).notNull(), // ['news', 'instagram']
  sourceIds: jsonb("source_ids"), // specific source IDs or null for all
  keywords: jsonb("keywords"), // required keywords
  excludeKeywords: jsonb("exclude_keywords"), // exclude if contains
  maxAgeDays: integer("max_age_days").default(7).notNull(),

  // === Scorer settings ===
  minScoreThreshold: integer("min_score_threshold").default(70).notNull(),

  // === Rate limits ===
  dailyLimit: integer("daily_limit").default(10).notNull(),
  itemsProcessedToday: integer("items_processed_today").default(0).notNull(),
  lastResetAt: timestamp("last_reset_at").defaultNow().notNull(),

  // === Budget limits ===
  monthlyBudgetLimit: decimal("monthly_budget_limit", { precision: 10, scale: 2 }).default('10.00').notNull(),
  currentMonthCost: decimal("current_month_cost", { precision: 10, scale: 2 }).default('0').notNull(),
  budgetResetAt: timestamp("budget_reset_at").defaultNow().notNull(),

  // === Style & Voice Customization (Phase 1) ===
  stylePreferences: jsonb("style_preferences").default({
    formality: 'conversational', // 'formal' | 'conversational' | 'casual'
    tone: 'engaging',            // 'serious' | 'engaging' | 'funny' | 'motivational'
    language: 'ru'               // 'ru' | 'en'
  }).notNull(),
  customGuidelines: jsonb("custom_guidelines").default([]).notNull(), // string[] of user rules
  durationRange: jsonb("duration_range").default({ min: 30, max: 90 }).notNull(), // seconds

  // === Custom Prompts (Phase 2) ===
  customPrompts: jsonb("custom_prompts"), // { writerPrompt?, architectPrompt?, analystPrompt?, scorerPrompt? }

  // === Script Examples (Phase 3) ===
  scriptExamples: jsonb("script_examples").default([]).notNull(), // string[] up to 5 examples, max 3000 chars each

  // === Learning data ===
  learnedThreshold: integer("learned_threshold"), // adaptive threshold
  rejectionPatterns: jsonb("rejection_patterns").default({}).notNull(),
  avoidedTopics: jsonb("avoided_topics").default([]).notNull(),
  preferredFormats: jsonb("preferred_formats").default([]).notNull(),

  // === Stats ===
  totalProcessed: integer("total_processed").default(0).notNull(),
  totalPassed: integer("total_passed").default(0).notNull(),
  totalFailed: integer("total_failed").default(0).notNull(),
  totalApproved: integer("total_approved").default(0).notNull(),
  totalRejected: integer("total_rejected").default(0).notNull(),
  approvalRate: decimal("approval_rate", { precision: 5, scale: 4 }),

  // === Timestamps ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("conveyor_settings_user_id_idx").on(table.userId),
]);

export const insertConveyorSettingsSchema = createInsertSchema(conveyorSettings).omit({
  id: true,
  itemsProcessedToday: true,
  lastResetAt: true,
  currentMonthCost: true,
  budgetResetAt: true,
  learnedThreshold: true,
  rejectionPatterns: true,
  avoidedTopics: true,
  preferredFormats: true,
  totalProcessed: true,
  totalPassed: true,
  totalFailed: true,
  totalApproved: true,
  totalRejected: true,
  approvalRate: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConveyorSettings = z.infer<typeof insertConveyorSettingsSchema>;
export type ConveyorSettings = typeof conveyorSettings.$inferSelect;
