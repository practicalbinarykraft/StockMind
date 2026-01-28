import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from './auth';

// ============================================================================
// SCENE COMMENTS TABLE
// Хранит комментарии к сценам при редактировании
// ============================================================================

export const sceneComments = pgTable("scene_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Связь со сценарием (может быть из scripts_library или auto_scripts)
  scriptId: varchar("script_id").notNull(),
  scriptType: varchar("script_type", { length: 20 }).notNull(), // 'library' | 'auto'
  
  // Информация о сцене
  sceneId: varchar("scene_id").notNull(), // ID сцены в массиве scenes
  sceneIndex: integer("scene_index").notNull(), // Индекс сцены (0, 1, 2...)
  
  // Комментарий
  commentText: text("comment_text").notNull(),
  commentType: varchar("comment_type", { length: 20 }).default('prompt').notNull(), // 'prompt', 'note', 'feedback'
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("scene_comments_script_idx").on(table.scriptId),
  index("scene_comments_user_idx").on(table.userId),
  index("scene_comments_created_at_idx").on(table.createdAt),
]);

export const insertSceneCommentSchema = createInsertSchema(sceneComments).omit({
  id: true,
  createdAt: true,
});

export type InsertSceneComment = z.infer<typeof insertSceneCommentSchema>;
export type SceneComment = typeof sceneComments.$inferSelect;
