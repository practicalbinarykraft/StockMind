import { db } from "../../db";
import {
  sceneTextLayers,
  type SceneTextLayer,
  type InsertSceneTextLayer,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export class TextLayersRepo {
  async getByLayerId(layerId: string): Promise<SceneTextLayer | undefined> {
    const [row] = await db
      .select()
      .from(sceneTextLayers)
      .where(eq(sceneTextLayers.layerId, layerId))
      .limit(1);
    return row;
  }

  async create(data: InsertSceneTextLayer): Promise<SceneTextLayer> {
    const position = data.position as {
      type: "top" | "center" | "bottom" | "custom";
      x?: number;
      y?: number;
    };
    const [row] = await db
      .insert(sceneTextLayers)
      .values({ ...data, position })
      .returning();
    if (!row) throw new Error("Failed to create text layer");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<SceneTextLayer, "id" | "layerId" | "createdAt">>
  ): Promise<SceneTextLayer | undefined> {
    const [updated] = await db
      .update(sceneTextLayers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sceneTextLayers.id, id))
      .returning();
    return updated;
  }

  async updateByLayerId(
    layerId: string,
    data: Partial<Omit<SceneTextLayer, "id" | "layerId" | "createdAt">>
  ): Promise<SceneTextLayer | undefined> {
    const [updated] = await db
      .update(sceneTextLayers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sceneTextLayers.layerId, layerId))
      .returning();
    return updated;
  }

  async deleteByLayerId(layerId: string): Promise<void> {
    await db
      .delete(sceneTextLayers)
      .where(eq(sceneTextLayers.layerId, layerId));
  }

  async getById(id: string): Promise<SceneTextLayer | undefined> {
    const [row] = await db
      .select()
      .from(sceneTextLayers)
      .where(eq(sceneTextLayers.id, id))
      .limit(1);
    return row;
  }
}

export const textLayersRepo = new TextLayersRepo();
