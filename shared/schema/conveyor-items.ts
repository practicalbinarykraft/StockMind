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

// ============================================================================
// CONVEYOR ITEMS TABLE
// Items being processed through the conveyor pipeline
// ============================================================================

export const conveyorItems = pgTable("conveyor_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // === Source reference ===
  sourceType: varchar("source_type", { length: 20 }).notNull(), // 'news' | 'instagram'
  sourceItemId: varchar("source_item_id").notNull(), // ID in rss_items or instagram_items

  // === Status ===
  status: varchar("status", { length: 20 }).default('processing').notNull(), // processing | completed | failed
  currentStage: integer("current_stage").default(1).notNull(), // 1-9

  // === Data from each agent ===
  sourceData: jsonb("source_data"), // Stage 1: Scout
  scoringData: jsonb("scoring_data"), // Stage 2: Scorer
  analysisData: jsonb("analysis_data"), // Stage 3: Analyst
  architectureData: jsonb("architecture_data"), // Stage 4: Architect
  scriptData: jsonb("script_data"), // Stage 5: Writer
  qcData: jsonb("qc_data"), // Stage 6: QC
  optimizationData: jsonb("optimization_data"), // Stage 7: Optimizer
  gateData: jsonb("gate_data"), // Stage 8: Gate

  // === Stage history ===
  stageHistory: jsonb("stage_history").default([]).notNull(), // [{stage, agent, startedAt, completedAt, success, error}]

  // === Revision context (if this is a revision) ===
  revisionContext: jsonb("revision_context"), // {notes, previousScriptId, attempt}
  parentItemId: varchar("parent_item_id"), // previous conveyor_item (self-reference)

  // === Timing ===
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  totalProcessingMs: integer("total_processing_ms"),

  // === Cost tracking ===
  totalCost: decimal("total_cost", { precision: 10, scale: 4 }).default('0').notNull(),

  // === Error tracking ===
  errorStage: integer("error_stage"), // which stage failed
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
}, (table) => [
  index("conveyor_items_user_id_idx").on(table.userId),
  index("conveyor_items_status_idx").on(table.status),
  index("conveyor_items_source_idx").on(table.sourceType, table.sourceItemId),
  index("conveyor_items_started_at_idx").on(table.startedAt),
]);

export const insertConveyorItemSchema = createInsertSchema(conveyorItems).omit({
  id: true,
  currentStage: true,
  sourceData: true,
  scoringData: true,
  analysisData: true,
  architectureData: true,
  scriptData: true,
  qcData: true,
  optimizationData: true,
  gateData: true,
  stageHistory: true,
  startedAt: true,
  completedAt: true,
  totalProcessingMs: true,
  totalCost: true,
  errorStage: true,
  errorMessage: true,
  retryCount: true,
});

export type InsertConveyorItem = z.infer<typeof insertConveyorItemSchema>;
export type ConveyorItem = typeof conveyorItems.$inferSelect;

// === Status enum ===
export const ConveyorItemStatus = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ConveyorItemStatusType = typeof ConveyorItemStatus[keyof typeof ConveyorItemStatus];

// === Stage enum ===
export const ConveyorStage = {
  SCOUT: 1,
  SCORER: 2,
  ANALYST: 3,
  ARCHITECT: 4,
  WRITER: 5,
  QC: 6,
  OPTIMIZER: 7,
  GATE: 8,
  DELIVERY: 9,
} as const;

export type ConveyorStageType = typeof ConveyorStage[keyof typeof ConveyorStage];
