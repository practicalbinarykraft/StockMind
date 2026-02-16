import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  real,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { scriptsLibrary } from './scripts-library';

// ============================================================================
// SCENE COMPOSITIONS TABLE
// ============================================================================

export const sceneCompositions = pgTable("scene_compositions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sceneId: varchar("scene_id").unique().notNull(), // Уникальная ссылка на ID сцены из scripts_library.scenes
  scriptId: varchar("script_id").notNull().references(() => scriptsLibrary.id, { onDelete: 'cascade' }),
  
  // Режим композиции
  mode: varchar("mode", { length: 20 }).notNull().default('overlay'), // 'overlay', 'split'
  
  // Параметры split-режима
  splitRatio: real("split_ratio").default(0.5), // Пропорция разделения для split-режима (0-1)
  splitDirection: varchar("split_direction", { length: 20 }).default('horizontal'), // 'horizontal', 'vertical'
  splitOrder: varchar("split_order", { length: 30 }).default('background-first'), // 'background-first', 'overlay-first'
  
  // Параметры сетки для drag & drop
  gridSnapping: boolean("grid_snapping").notNull().default(true), // Привязка к сетке
  gridSize: integer("grid_size").notNull().default(10), // Размер сетки в px
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("scene_compositions_script_id_idx").on(table.scriptId),
  index("scene_compositions_scene_id_idx").on(table.sceneId),
]);

export const insertSceneCompositionSchema = createInsertSchema(sceneCompositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSceneComposition = z.infer<typeof insertSceneCompositionSchema>;
export type SceneComposition = typeof sceneCompositions.$inferSelect;
