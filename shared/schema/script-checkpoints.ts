import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { scriptsLibrary } from './scripts-library';

// ============================================================================
// SCRIPT CHECKPOINTS TABLE
// Технические снапшоты для автосохранения и восстановления
// TTL = 7 дней, автоматическая очистка через cron job
// ============================================================================

export const scriptCheckpoints = pgTable("script_checkpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scriptId: varchar("script_id").notNull().references(() => scriptsLibrary.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Тип checkpoint (всегда 'checkpoint')
  kind: varchar("kind", { length: 20 }).default('checkpoint').notNull(),
  
  // Причина создания: exit|ttl|recovery|pre_ai|auto
  reason: varchar("reason", { length: 50 }).notNull(),
  
  // Снапшот данных
  scenes: jsonb("scenes").notNull(), // Полная копия scenes
  fullText: text("full_text").notNull(), // Полный текст для озвучки
  
  // Дополнительные метаданные
  metadata: jsonb("metadata"), // {editingSceneId, isDirty, timestamp, etc}
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // created_at + 7 дней
}, (table) => [
  index("script_checkpoints_script_id_idx").on(table.scriptId),
  index("script_checkpoints_user_id_idx").on(table.userId),
  index("script_checkpoints_expires_at_idx").on(table.expiresAt),
  index("script_checkpoints_reason_idx").on(table.reason),
  index("script_checkpoints_created_at_idx").on(table.createdAt),
]);

// Zod схемы для валидации
export const insertScriptCheckpointSchema = createInsertSchema(scriptCheckpoints).omit({
  id: true,
  createdAt: true,
});

// Расширенная схема с вычисляемым expiresAt
export const createScriptCheckpointSchema = insertScriptCheckpointSchema.omit({
  expiresAt: true,
}).extend({
  // expiresAt будет вычисляться автоматически
});

// Типы
export type InsertScriptCheckpoint = z.infer<typeof insertScriptCheckpointSchema>;
export type CreateScriptCheckpoint = z.infer<typeof createScriptCheckpointSchema>;
export type ScriptCheckpoint = typeof scriptCheckpoints.$inferSelect;

// Типы для reason
export const CheckpointReason = z.enum(['exit', 'ttl', 'recovery', 'pre_ai', 'auto']);
export type CheckpointReasonType = z.infer<typeof CheckpointReason>;

// Типы для metadata
export const CheckpointMetadataSchema = z.object({
  editingSceneId: z.string().nullable().optional(),
  isDirty: z.boolean().optional(),
  timestamp: z.string().optional(),
  // Дополнительные поля могут быть добавлены
}).passthrough();

export type CheckpointMetadata = z.infer<typeof CheckpointMetadataSchema>;
