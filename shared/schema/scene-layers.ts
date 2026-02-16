import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { scriptsLibrary } from './scripts-library';

// ============================================================================
// SCENE LAYERS TABLE
// ============================================================================

export const sceneLayers = pgTable("scene_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sceneId: varchar("scene_id").notNull(), // ID сцены из scripts_library.scenes[]
  scriptId: varchar("script_id").notNull().references(() => scriptsLibrary.id, { onDelete: 'cascade' }),
  
  layerType: varchar("layer_type", { length: 20 }).notNull(), // 'background', 'overlay', 'textLayer'
  order: integer("order").notNull().default(0), // z-index порядок слоя
  isVisible: boolean("is_visible").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("scene_layers_script_id_idx").on(table.scriptId),
  index("scene_layers_scene_id_idx").on(table.sceneId),
  index("scene_layers_script_scene_idx").on(table.scriptId, table.sceneId),
]);

export const insertSceneLayerSchema = createInsertSchema(sceneLayers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSceneLayer = z.infer<typeof insertSceneLayerSchema>;
export type SceneLayer = typeof sceneLayers.$inferSelect;
