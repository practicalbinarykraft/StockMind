import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { conveyorItems } from './conveyor-items';

// ============================================================================
// CONVEYOR LOGS TABLE
// Audit log for conveyor operations
// ============================================================================

export const conveyorLogs = pgTable("conveyor_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  conveyorItemId: varchar("conveyor_item_id").references(() => conveyorItems.id, { onDelete: 'cascade' }),

  // === Event info ===
  eventType: varchar("event_type", { length: 50 }).notNull(),
  stageNumber: integer("stage_number"),
  agentName: varchar("agent_name", { length: 50 }),

  // === Details ===
  details: jsonb("details"),

  // === Timestamp ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("conveyor_logs_user_id_idx").on(table.userId),
  index("conveyor_logs_item_id_idx").on(table.conveyorItemId),
  index("conveyor_logs_event_type_idx").on(table.eventType),
  index("conveyor_logs_created_at_idx").on(table.createdAt),
]);

export const insertConveyorLogSchema = createInsertSchema(conveyorLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertConveyorLog = z.infer<typeof insertConveyorLogSchema>;
export type ConveyorLog = typeof conveyorLogs.$inferSelect;

// === Event types ===
export const ConveyorEventType = {
  // Item lifecycle
  ITEM_CREATED: 'item_created',
  ITEM_COMPLETED: 'item_completed',
  ITEM_FAILED: 'item_failed',
  ITEM_RETRIED: 'item_retried',

  // Stage events
  STAGE_STARTED: 'stage_started',
  STAGE_COMPLETED: 'stage_completed',
  STAGE_FAILED: 'stage_failed',
  STAGE_THINKING: 'stage_thinking', // Agent thinking/progress events

  // Script events
  SCRIPT_CREATED: 'script_created',
  SCRIPT_APPROVED: 'script_approved',
  SCRIPT_REJECTED: 'script_rejected',
  SCRIPT_REVISION_REQUESTED: 'script_revision_requested',

  // Settings events
  SETTINGS_UPDATED: 'settings_updated',
  DAILY_LIMIT_REACHED: 'daily_limit_reached',
  BUDGET_LIMIT_REACHED: 'budget_limit_reached',

  // Learning events
  PATTERN_LEARNED: 'pattern_learned',
  THRESHOLD_ADJUSTED: 'threshold_adjusted',
  TOPIC_AVOIDED: 'topic_avoided',

  // Error events
  ERROR: 'error',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
} as const;

export type ConveyorEventTypeValue = typeof ConveyorEventType[keyof typeof ConveyorEventType];
