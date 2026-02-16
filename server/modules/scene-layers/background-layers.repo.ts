import { db } from "../../db";
import {
  sceneBackgroundLayers,
  type SceneBackgroundLayer,
  type InsertSceneBackgroundLayer,
} from "@shared/schema";
import { eq } from "drizzle-orm";

const GENERATION_STATUSES = ["pending", "processing", "ready", "failed"] as const;

export class BackgroundLayersRepo {
  async getByLayerId(layerId: string): Promise<SceneBackgroundLayer | undefined> {
    const [row] = await db
      .select()
      .from(sceneBackgroundLayers)
      .where(eq(sceneBackgroundLayers.layerId, layerId))
      .limit(1);
    return row;
  }

  async create(
    data: InsertSceneBackgroundLayer
  ): Promise<SceneBackgroundLayer> {
    const [row] = await db
      .insert(sceneBackgroundLayers)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    if (!row) throw new Error("Failed to create background layer");
    return row;
  }

  async update(
    id: string,
    data: Partial<Omit<SceneBackgroundLayer, "id" | "layerId" | "createdAt">>
  ): Promise<SceneBackgroundLayer | undefined> {
    const [updated] = await db
      .update(sceneBackgroundLayers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sceneBackgroundLayers.id, id))
      .returning();
    return updated;
  }

  async updateByLayerId(
    layerId: string,
    data: Partial<Omit<SceneBackgroundLayer, "id" | "layerId" | "createdAt">>
  ): Promise<SceneBackgroundLayer | undefined> {
    const [updated] = await db
      .update(sceneBackgroundLayers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sceneBackgroundLayers.layerId, layerId))
      .returning();
    return updated;
  }

  async updateGenerationStatus(
    layerId: string,
    status: (typeof GENERATION_STATUSES)[number],
    jobId?: string
  ): Promise<SceneBackgroundLayer | undefined> {
    const set: Record<string, unknown> = {
      generationStatus: status,
      updatedAt: new Date(),
    };
    if (jobId !== undefined) set.generationJobId = jobId;
    const [updated] = await db
      .update(sceneBackgroundLayers)
      .set(set)
      .where(eq(sceneBackgroundLayers.layerId, layerId))
      .returning();
    return updated;
  }

  async deleteByLayerId(layerId: string): Promise<void> {
    await db
      .delete(sceneBackgroundLayers)
      .where(eq(sceneBackgroundLayers.layerId, layerId));
  }

  async getById(id: string): Promise<SceneBackgroundLayer | undefined> {
    const [row] = await db
      .select()
      .from(sceneBackgroundLayers)
      .where(eq(sceneBackgroundLayers.id, id))
      .limit(1);
    return row;
  }
}

export const backgroundLayersRepo = new BackgroundLayersRepo();
