import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  jsonb,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sceneLayers } from './scene-layers';

// ============================================================================
// SCENE OVERLAY LAYERS TABLE
// ============================================================================

export const sceneOverlayLayers = pgTable("scene_overlay_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layerId: varchar("layer_id").unique().notNull().references(() => sceneLayers.id, { onDelete: 'cascade' }),
  
  // Тип контента
  contentType: varchar("content_type", { length: 20 }).notNull(), // 'avatar', 'image', 'video'
  sourceUrl: varchar("source_url"), // URL контента в R2
  
  // Позиционирование (в процентах от canvas)
  position: jsonb("position").notNull().$type<{ 
    x: number; // 0-100 (%)
    y: number; // 0-100 (%)
    width: number; // 0-100 (%)
    height: number; // 0-100 (%)
  }>(),
  
  // Отображение контента
  objectFit: varchar("object_fit", { length: 20 }).notNull().default('contain'), // 'contain', 'cover', 'fill'
  
  // Настройки размера
  aspectLock: boolean("aspect_lock").notNull().default(true), // Фиксация пропорций
  minSize: jsonb("min_size").$type<{ width: number; height: number }>(), // Минимальные размеры
  maxSize: jsonb("max_size").$type<{ width: number; height: number }>(), // Максимальные размеры
  rotation: real("rotation").default(0), // Угол поворота (зарезервировано на будущее)
  
  // Генерация контента
  generationPrompt: text("generation_prompt"), // Промпт для генерации
  generationModel: varchar("generation_model"), // Kie.ai model ID или 'heygen'
  generationStatus: varchar("generation_status", { length: 20 }), // 'pending', 'processing', 'ready', 'failed'
  generationJobId: varchar("generation_job_id"), // ID задачи генерации
  
  // Дополнительные параметры
  metadata: jsonb("metadata"), // Дополнительные параметры
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("scene_overlay_layers_layer_id_idx").on(table.layerId),
  index("scene_overlay_layers_generation_status_idx").on(table.generationStatus),
]);

export const insertSceneOverlayLayerSchema = createInsertSchema(sceneOverlayLayers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSceneOverlayLayer = z.infer<typeof insertSceneOverlayLayerSchema>;
export type SceneOverlayLayer = typeof sceneOverlayLayers.$inferSelect;
