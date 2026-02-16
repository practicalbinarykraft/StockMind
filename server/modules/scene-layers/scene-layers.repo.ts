import { db } from "../../db";
import {
  sceneLayers,
  type SceneLayer,
  type InsertSceneLayer,
} from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";

/**
 * Repository for scene_layers table.
 * Base layer records linked to script/scene.
 */
export class SceneLayersRepo {
  async getLayersBySceneId(sceneId: string): Promise<SceneLayer[]> {
    return await db
      .select()
      .from(sceneLayers)
      .where(eq(sceneLayers.sceneId, sceneId))
      .orderBy(asc(sceneLayers.order));
  }

  async getLayersByScriptId(scriptId: string): Promise<SceneLayer[]> {
    return await db
      .select()
      .from(sceneLayers)
      .where(eq(sceneLayers.scriptId, scriptId))
      .orderBy(asc(sceneLayers.sceneId), asc(sceneLayers.order));
  }

  async getById(id: string): Promise<SceneLayer | undefined> {
    const [row] = await db
      .select()
      .from(sceneLayers)
      .where(eq(sceneLayers.id, id))
      .limit(1);
    return row;
  }

  async createLayer(data: InsertSceneLayer): Promise<SceneLayer> {
    const [layer] = await db
      .insert(sceneLayers)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();
    if (!layer) throw new Error("Failed to create scene layer");
    return layer;
  }

  async updateLayer(
    id: string,
    data: Partial<Omit<SceneLayer, "id" | "createdAt">>
  ): Promise<SceneLayer | undefined> {
    const [updated] = await db
      .update(sceneLayers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sceneLayers.id, id))
      .returning();
    return updated;
  }

  async deleteLayer(id: string): Promise<void> {
    await db.delete(sceneLayers).where(eq(sceneLayers.id, id));
  }

  async deleteLayersBySceneId(sceneId: string): Promise<void> {
    await db.delete(sceneLayers).where(eq(sceneLayers.sceneId, sceneId));
  }
}

export const sceneLayersRepo = new SceneLayersRepo();
