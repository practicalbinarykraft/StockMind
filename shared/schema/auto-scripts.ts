import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  jsonb,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { projects } from './projects';
import { conveyorItems } from './conveyor-items';

// ============================================================================
// AUTO SCRIPTS TABLE
// Generated scripts pending user review
// ============================================================================

export const autoScripts = pgTable("auto_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  conveyorItemId: varchar("conveyor_item_id").notNull().references(() => conveyorItems.id, { onDelete: 'cascade' }),

  // === Source reference ===
  sourceType: varchar("source_type", { length: 20 }).notNull(),
  sourceItemId: varchar("source_item_id").notNull(),

  // === Script content ===
  title: text("title").notNull(),
  scenes: jsonb("scenes").notNull(), // [{id, label, text, start, end, visualNotes}]
  fullScript: text("full_script").notNull(),
  formatId: varchar("format_id", { length: 50 }).notNull(),
  formatName: varchar("format_name", { length: 100 }).notNull(),
  estimatedDuration: integer("estimated_duration"), // seconds

  // === Scores ===
  initialScore: integer("initial_score"), // before optimization
  finalScore: integer("final_score").notNull(), // after optimization
  hookScore: integer("hook_score"),
  structureScore: integer("structure_score"),
  emotionalScore: integer("emotional_score"),
  ctaScore: integer("cta_score"),

  // === Gate decision ===
  gateDecision: varchar("gate_decision", { length: 20 }).notNull(), // 'PASS' | 'NEEDS_REVIEW'
  gateConfidence: decimal("gate_confidence", { precision: 3, scale: 2 }),

  // === User review ===
  status: varchar("status", { length: 20 }).default('pending').notNull(), // pending | approved | rejected | revision
  rejectionReason: text("rejection_reason"),
  rejectionCategory: varchar("rejection_category", { length: 50 }), // too_long, boring_intro, etc.
  revisionNotes: text("revision_notes"),
  revisionCount: integer("revision_count").default(0).notNull(),

  // === If approved ===
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'set null' }),

  // === Timestamps ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("auto_scripts_user_id_idx").on(table.userId),
  index("auto_scripts_status_idx").on(table.status),
  index("auto_scripts_user_status_idx").on(table.userId, table.status),
  index("auto_scripts_created_at_idx").on(table.createdAt),
]);

export const insertAutoScriptSchema = createInsertSchema(autoScripts).omit({
  id: true,
  revisionCount: true,
  projectId: true,
  createdAt: true,
  reviewedAt: true,
});

export type InsertAutoScript = z.infer<typeof insertAutoScriptSchema>;
export type AutoScript = typeof autoScripts.$inferSelect;

// === Status enum ===
export const AutoScriptStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVISION: 'revision',
} as const;

export type AutoScriptStatusType = typeof AutoScriptStatus[keyof typeof AutoScriptStatus];

// === Gate decision enum ===
export const GateDecision = {
  PASS: 'PASS',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  FAIL: 'FAIL',
} as const;

export type GateDecisionType = typeof GateDecision[keyof typeof GateDecision];

// === Rejection categories ===
export const RejectionCategory = {
  TOO_LONG: 'too_long',
  TOO_SHORT: 'too_short',
  BORING_INTRO: 'boring_intro',
  WEAK_CTA: 'weak_cta',
  TOO_FORMAL: 'too_formal',
  TOO_CASUAL: 'too_casual',
  BORING_TOPIC: 'boring_topic',
  WRONG_TONE: 'wrong_tone',
  NO_HOOK: 'no_hook',
  TOO_COMPLEX: 'too_complex',
  OFF_TOPIC: 'off_topic',
  OTHER: 'other',
} as const;

export type RejectionCategoryType = typeof RejectionCategory[keyof typeof RejectionCategory];
