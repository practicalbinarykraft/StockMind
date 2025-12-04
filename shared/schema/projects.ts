import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';

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
  skipReason: varchar("skip_reason"), // Reason for skipping this step (e.g., "custom_voice", "custom_video")
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
