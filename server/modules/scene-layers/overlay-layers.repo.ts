import { db } from "../../db";
import {
  sceneOverlayLayers,
  type SceneOverlayLayer,
  type InsertSceneOverlayLayer,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class OverlayLayersRepo {
  async getByLayerId(layerId: string): Promise<SceneOverlayLayer | undefined> {
    const [row] = await db
      .select()
      .from(sceneOverlayLayers)
      .where(eq(sceneOverlayLayers.layerId, layerId))
      .limit(1);
    return row;
  }

  async create(data: InsertSceneOverlayLayer): Promise<SceneOverlayLayer> {
    const [row] = await db
      .insert(sceneOverlayLayers)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    if (!row) throw new Error("Failed to create overlay layer");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<SceneOverlayLayer, "id" | "layerId" | "createdAt">>
  ): Promise<SceneOverlayLayer | undefined> {
    const [updated] = await db
      .update(sceneOverlayLayers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sceneOverlayLayers.id, id))
      .returning();
    return updated;
  }

  async updatePosition(layerId: string, position: Position): Promise<SceneOverlayLayer | undefined> {
    const [updated] = await db
      .update(sceneOverlayLayers)
      .set({ position, updatedAt: new Date() })
      .where(eq(sceneOverlayLayers.layerId, layerId))
      .returning();
    return updated;
  }

  async deleteByLayerId(layerId: string): Promise<void> {
    await db
      .delete(sceneOverlayLayers)
      .where(eq(sceneOverlayLayers.layerId, layerId));
  }

  async getById(id: string): Promise<SceneOverlayLayer | undefined> {
    const [row] = await db
      .select()
      .from(sceneOverlayLayers)
      .where(eq(sceneOverlayLayers.id, id))
      .limit(1);
    return row;
  }
}

export const overlayLayersRepo = new OverlayLayersRepo();
