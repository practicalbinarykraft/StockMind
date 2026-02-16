import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sceneLayers } from './scene-layers';

// ============================================================================
// SCENE BACKGROUND LAYERS TABLE
// ============================================================================

export const sceneBackgroundLayers = pgTable("scene_background_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layerId: varchar("layer_id").unique().notNull().references(() => sceneLayers.id, { onDelete: 'cascade' }),
  
  // Тип контента
  contentType: varchar("content_type", { length: 20 }).notNull(), // 'avatar', 'image', 'video'
  sourceUrl: varchar("source_url"), // URL контента в R2
  
  // Генерация контента
  generationPrompt: text("generation_prompt"), // Промпт для генерации
  generationModel: varchar("generation_model"), // Kie.ai model ID или 'heygen'
  generationStatus: varchar("generation_status", { length: 20 }), // 'pending', 'processing', 'ready', 'failed'
  generationJobId: varchar("generation_job_id"), // ID задачи генерации
  
  // Параметры контента
  dimensions: jsonb("dimensions").$type<{ width: number; height: number }>(), // Размеры контента
  metadata: jsonb("metadata"), // Дополнительные параметры
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("scene_background_layers_layer_id_idx").on(table.layerId),
  index("scene_background_layers_generation_status_idx").on(table.generationStatus),
]);

export const insertSceneBackgroundLayerSchema = createInsertSchema(sceneBackgroundLayers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSceneBackgroundLayer = z.infer<typeof insertSceneBackgroundLayerSchema>;
export type SceneBackgroundLayer = typeof sceneBackgroundLayers.$inferSelect;
