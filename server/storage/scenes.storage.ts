// Scene Recommendations storage operations
import { db } from "../db";
import {
  sceneRecommendations,
  type SceneRecommendation,
  type InsertSceneRecommendation,
} from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Scenes storage interface
 */
export interface IScenesStorage {
  getSceneRecommendations(scriptVersionId: string): Promise<SceneRecommendation[]>;
  createSceneRecommendations(data: InsertSceneRecommendation[]): Promise<SceneRecommendation[]>;
  updateSceneRecommendation(id: string, data: Partial<SceneRecommendation>): Promise<SceneRecommendation | undefined>;
  markRecommendationApplied(id: string): Promise<void>;
  markRecommendationsAppliedBatch(ids: string[]): Promise<void>;
}

/**
 * Scenes storage implementation
 * Handles scene recommendations for script versions
 */
export class ScenesStorage implements IScenesStorage {
  /**
   * Get all scene recommendations for a script version
   */
  async getSceneRecommendations(scriptVersionId: string): Promise<SceneRecommendation[]> {
    return await db
      .select()
      .from(sceneRecommendations)
      .where(eq(sceneRecommendations.scriptVersionId, scriptVersionId))
      .orderBy(sceneRecommendations.sceneId);
  }

  /**
   * Create multiple scene recommendations
   */
  async createSceneRecommendations(data: InsertSceneRecommendation[]): Promise<SceneRecommendation[]> {
    if (data.length === 0) return [];

    return await db
      .insert(sceneRecommendations)
      .values(data)
      .returning();
  }

  /**
   * Update a scene recommendation
   */
  async updateSceneRecommendation(
    id: string,
    data: Partial<SceneRecommendation>
  ): Promise<SceneRecommendation | undefined> {
    const [recommendation] = await db
      .update(sceneRecommendations)
      .set(data)
      .where(eq(sceneRecommendations.id, id))
      .returning();
    return recommendation;
  }

  /**
   * Mark a recommendation as applied
   */
  async markRecommendationApplied(id: string): Promise<void> {
    await db
      .update(sceneRecommendations)
      .set({ applied: true, appliedAt: new Date() })
      .where(eq(sceneRecommendations.id, id));
  }

  /**
   * Mark multiple recommendations as applied in a batch
   */
  async markRecommendationsAppliedBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await db.transaction(async (tx) => {
      for (const id of ids) {
        await tx
          .update(sceneRecommendations)
          .set({ applied: true, appliedAt: new Date() })
          .where(eq(sceneRecommendations.id, id));
      }
    });
  }
}

export const scenesStorage = new ScenesStorage();
