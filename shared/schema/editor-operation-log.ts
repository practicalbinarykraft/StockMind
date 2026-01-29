import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { scriptsLibrary } from './scripts-library';

// ============================================================================
// EDITOR OPERATION LOG TABLE
// Аудит всех операций в редакторе для отладки и понимания поведения пользователя
// ============================================================================

export const editorOperationLog = pgTable("editor_operation_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scriptId: varchar("script_id").notNull().references(() => scriptsLibrary.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Тип операции: scene_edit|save|auto_save|checkpoint|ai_regenerate|cancel|create_version|exit_with_unsaved
  operationType: varchar("operation_type", { length: 50 }).notNull(),
  
  // ID сцены (если операция связана с конкретной сценой)
  sceneId: varchar("scene_id"),
  
  // Детали операции
  details: jsonb("details"), // {before, after, prompt, reason, timestamp, etc}
  
  // Timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("editor_operation_log_script_id_idx").on(table.scriptId),
  index("editor_operation_log_user_id_idx").on(table.userId),
  index("editor_operation_log_operation_type_idx").on(table.operationType),
  index("editor_operation_log_created_at_idx").on(table.createdAt),
]);

// Zod схемы для валидации
export const insertEditorOperationLogSchema = createInsertSchema(editorOperationLog).omit({
  id: true,
  createdAt: true,
});

// Типы
export type InsertEditorOperationLog = z.infer<typeof insertEditorOperationLogSchema>;
export type EditorOperationLog = typeof editorOperationLog.$inferSelect;

// Типы для operationType
export const OperationType = z.enum([
  'scene_edit',
  'save',
  'auto_save',
  'checkpoint',
  'ai_regenerate',
  'cancel',
  'create_version',
  'exit_with_unsaved'
]);
export type OperationTypeValue = z.infer<typeof OperationType>;

// Типы для details в зависимости от операции
export const OperationDetailsSchema = z.object({
  before: z.string().optional(),
  after: z.string().optional(),
  prompt: z.string().optional(),
  reason: z.string().optional(),
  timestamp: z.string().optional(),
  lengthOption: z.string().optional(),
  type: z.string().optional(),
  // Дополнительные поля могут быть добавлены
}).passthrough();

export type OperationDetails = z.infer<typeof OperationDetailsSchema>;
