import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  text,
  jsonb,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sceneLayers } from './scene-layers';

// ============================================================================
// SCENE TEXT LAYERS TABLE
// ============================================================================

export const sceneTextLayers = pgTable("scene_text_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layerId: varchar("layer_id").unique().notNull().references(() => sceneLayers.id, { onDelete: 'cascade' }),
  
  // Текстовый контент
  text: text("text").notNull(), // Текст слоя (может отличаться от основного текста сцены)
  mode: varchar("mode", { length: 20 }).notNull().default('static'), // 'static', 'marquee'
  
  // Позиционирование
  position: jsonb("position").notNull().$type<{
    type: 'top' | 'center' | 'bottom' | 'custom';
    x?: number; // Для custom позиции (0-100%)
    y?: number; // Для custom позиции (0-100%)
  }>(),
  
  // Стилизация текста
  fontSize: integer("font_size").notNull().default(32), // Размер шрифта в px
  fontFamily: varchar("font_family").notNull().default('Inter'), // Семейство шрифта
  textColor: varchar("text_color", { length: 9 }).notNull().default('#FFFFFF'), // Цвет текста (hex)
  textAlign: varchar("text_align", { length: 10 }).notNull().default('center'), // 'left', 'center', 'right'
  
  // Фон текста
  backgroundColor: varchar("background_color", { length: 9 }), // Цвет фона (hex, nullable)
  backgroundOpacity: real("background_opacity").notNull().default(0.8), // Прозрачность фона 0-1
  
  // Параметры бегущей строки
  marqueeSpeed: real("marquee_speed").default(100), // Скорость бегущей строки (px/sec)
  
  // Видимость
  isVisible: boolean("is_visible").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("scene_text_layers_layer_id_idx").on(table.layerId),
]);

export const insertSceneTextLayerSchema = createInsertSchema(sceneTextLayers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSceneTextLayer = z.infer<typeof insertSceneTextLayerSchema>;
export type SceneTextLayer = typeof sceneTextLayers.$inferSelect;
