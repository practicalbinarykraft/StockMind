import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';
import { projects } from './projects';

// ============================================================================
// SCRIPTS LIBRARY TABLE
// ============================================================================

export const scriptsLibrary = pgTable("scripts_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Основная информация
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default('draft').notNull(), // 'draft', 'analyzed', 'ready', 'in_production', 'completed'
  
  // Контент
  scenes: jsonb("scenes").notNull(), // Array of scene objects: [{sceneNumber, text, start, end, duration, notes}]
  fullText: text("full_text"), // Полный текст для озвучки
  
  // Метаданные
  format: varchar("format", { length: 50 }), // 'news_update', 'explainer', 'hook_story', etc.
  durationSeconds: integer("duration_seconds"),
  wordCount: integer("word_count"),
  
  // Оценки
  aiScore: integer("ai_score"), // 0-100
  aiAnalysis: jsonb("ai_analysis"), // Результат analyzeScriptAdvanced()
  aiRecommendations: jsonb("ai_recommendations"), // Рекомендации для улучшения
  
  // Источник
  sourceType: varchar("source_type", { length: 50 }), // 'rss', 'reddit', 'instagram', 'custom'
  sourceId: varchar("source_id"), // ID статьи/поста если есть
  sourceTitle: text("source_title"),
  sourceUrl: text("source_url"),
  
  // Связь с проектом (если есть)
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'set null' }),
  
  // Версионирование
  version: integer("version").default(1).notNull(),
  parentScriptId: varchar("parent_script_id").references((): any => scriptsLibrary.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  analyzedAt: timestamp("analyzed_at"),
  
  // Tags и заметки
  tags: jsonb("tags"), // Array of strings
  notes: text("notes"), // Пользовательские заметки
}, (table) => [
  index("scripts_library_user_id_idx").on(table.userId),
  index("scripts_library_status_idx").on(table.status),
  index("scripts_library_source_idx").on(table.sourceType, table.sourceId),
  index("scripts_library_project_idx").on(table.projectId),
]);

export const insertScriptLibrarySchema = createInsertSchema(scriptsLibrary).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScriptLibrary = z.infer<typeof insertScriptLibrarySchema>;
export type ScriptLibrary = typeof scriptsLibrary.$inferSelect;

