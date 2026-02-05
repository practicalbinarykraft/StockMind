import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { scriptsLibrary } from './scripts-library';

// ============================================================================
// SCRIPTS MEDIA TABLE
// ============================================================================

export const scriptsMedia = pgTable("scripts_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scriptId: varchar("script_id").unique().notNull().references(() => scriptsLibrary.id, { onDelete: 'cascade' }),
  
  // Аудио
  audioUrl: varchar("audio_url"),
  audioMode: varchar("audio_mode"), // 'generate', 'upload', 'record'
  selectedVoice: varchar("selected_voice"),
  audioFilename: varchar("audio_filename"),
  audioFilesize: integer("audio_filesize"),
  audioGeneratedAt: timestamp("audio_generated_at"),
  
  // Видео
  videoUrl: varchar("video_url"),
  videoId: varchar("video_id"),
  selectedAvatar: varchar("selected_avatar"),
  videoDuration: real("video_duration"),
  videoStatus: varchar("video_status"), // 'generating', 'completed', 'failed'
  videoThumbnailUrl: varchar("video_thumbnail_url"),
  videoGeneratedAt: timestamp("video_generated_at"),
  videoErrorMessage: text("video_error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_scripts_media_script_id").on(table.scriptId),
]);

export const insertScriptMediaSchema = createInsertSchema(scriptsMedia).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScriptMedia = z.infer<typeof insertScriptMediaSchema>;
export type ScriptMedia = typeof scriptsMedia.$inferSelect;
