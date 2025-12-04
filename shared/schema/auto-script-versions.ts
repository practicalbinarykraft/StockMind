import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { autoScripts } from './auto-scripts';

// ============================================================================
// AUTO SCRIPT VERSIONS TABLE
// Version history for auto-scripts with revision tracking
// ============================================================================

export const autoScriptVersions = pgTable("auto_script_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  autoScriptId: varchar("auto_script_id").notNull().references(() => autoScripts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  versionNumber: integer("version_number").notNull(), // 1, 2, 3, 4, 5 (max 5)

  // === Script content (snapshot) ===
  title: text("title").notNull(),
  scenes: jsonb("scenes").notNull(), // [{id, label, text, start, end, visualNotes}]
  fullScript: text("full_script").notNull(),

  // === Scores ===
  finalScore: integer("final_score"),
  hookScore: integer("hook_score"),
  structureScore: integer("structure_score"),
  emotionalScore: integer("emotional_score"),
  ctaScore: integer("cta_score"),

  // === Revision context ===
  feedbackText: text("feedback_text"), // User's review/feedback that led to this version
  feedbackSceneIds: jsonb("feedback_scene_ids"), // [0, 2] - which scenes user wanted to revise

  // === Diff from previous version ===
  diff: jsonb("diff"), // Array of { sceneIndex, before, after }

  // === Status ===
  isCurrent: boolean("is_current").default(false).notNull(),

  // === Timestamps ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("auto_script_versions_script_idx").on(table.autoScriptId),
  index("auto_script_versions_user_idx").on(table.userId),
  index("auto_script_versions_current_idx").on(table.autoScriptId, table.isCurrent),
]);

export const insertAutoScriptVersionSchema = createInsertSchema(autoScriptVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertAutoScriptVersion = z.infer<typeof insertAutoScriptVersionSchema>;
export type AutoScriptVersion = typeof autoScriptVersions.$inferSelect;

// ============================================================================
// USER WRITING PROFILE TABLE
// Synthesized preferences learned from user feedback
// ============================================================================

export const userWritingProfiles = pgTable("user_writing_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  // === Learned patterns ===
  avoidPatterns: jsonb("avoid_patterns").default(sql`'[]'::jsonb`).notNull(),
  // ["желтая пресса", "СТОП!", "кликбейт заголовки", "риторические вопросы"]

  preferPatterns: jsonb("prefer_patterns").default(sql`'[]'::jsonb`).notNull(),
  // ["конкретные цифры", "провокационный тон", "ирония"]

  // === Style preferences ===
  tonePreference: varchar("tone_preference", { length: 50 }),
  // "provocative_smart" | "calm_analytical" | "energetic" | etc

  styleNotes: text("style_notes"),
  // Free-form notes synthesized from feedback

  // === Extracted rules (structured) ===
  writingRules: jsonb("writing_rules").default(sql`'[]'::jsonb`).notNull(),
  // [{ type: "never"|"always"|"prefer", rule: "...", weight: 1-5, examples: [...] }]

  // === Summary for AI ===
  aiSummary: text("ai_summary"),
  // AI-generated summary of user preferences for prompt injection

  // === Stats ===
  totalFeedbackCount: integer("total_feedback_count").default(0).notNull(),
  lastFeedbackAt: timestamp("last_feedback_at"),

  // === Timestamps ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_writing_profiles_user_idx").on(table.userId),
]);

export const insertUserWritingProfileSchema = createInsertSchema(userWritingProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserWritingProfile = z.infer<typeof insertUserWritingProfileSchema>;
export type UserWritingProfile = typeof userWritingProfiles.$inferSelect;

// ============================================================================
// USER FEEDBACK ENTRIES TABLE
// Individual feedback entries for learning and history
// ============================================================================

export const userFeedbackEntries = pgTable("user_feedback_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  autoScriptId: varchar("auto_script_id").references(() => autoScripts.id, { onDelete: 'set null' }),
  autoScriptVersionId: varchar("auto_script_version_id").references(() => autoScriptVersions.id, { onDelete: 'set null' }),

  // === Feedback content ===
  feedbackType: varchar("feedback_type", { length: 20 }).notNull(),
  // "revision" | "rejection" | "approval_with_notes"

  feedbackText: text("feedback_text").notNull(),
  // User's actual feedback text

  targetSceneIds: jsonb("target_scene_ids"),
  // [0, 2] - which scenes the feedback is about (null = whole script)

  // === Original content (for context) ===
  originalScript: text("original_script"),
  // The script text that user gave feedback on

  originalScenes: jsonb("original_scenes"),
  // The scenes that user gave feedback on

  // === AI-extracted insights ===
  extractedPatterns: jsonb("extracted_patterns"),
  // { avoid: [...], prefer: [...], rules: [...] }

  extractedSentiment: varchar("extracted_sentiment", { length: 20 }),
  // "negative" | "constructive" | "positive"

  // === Processing status ===
  processedAt: timestamp("processed_at"),
  // When AI processed this feedback

  appliedToProfile: boolean("applied_to_profile").default(false).notNull(),

  // === Timestamps ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_feedback_entries_user_idx").on(table.userId),
  index("user_feedback_entries_script_idx").on(table.autoScriptId),
  index("user_feedback_entries_processed_idx").on(table.userId, table.appliedToProfile),
]);

export const insertUserFeedbackEntrySchema = createInsertSchema(userFeedbackEntries).omit({
  id: true,
  processedAt: true,
  appliedToProfile: true,
  createdAt: true,
});

export type InsertUserFeedbackEntry = z.infer<typeof insertUserFeedbackEntrySchema>;
export type UserFeedbackEntry = typeof userFeedbackEntries.$inferSelect;

// === Helper types ===

export interface WritingRule {
  type: 'never' | 'always' | 'prefer' | 'avoid';
  rule: string;
  weight: number; // 1-5, how strongly user feels about this
  examples?: string[];
  sourceCount?: number; // how many times user mentioned this
}

export interface ExtractedPatterns {
  avoid: string[];
  prefer: string[];
  rules: WritingRule[];
}

export interface SceneDiff {
  sceneIndex: number;
  sceneName: string;
  before: string;
  after: string;
}
