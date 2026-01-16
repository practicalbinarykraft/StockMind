import { db } from "../../db";
import { scriptVersions, sceneRecommendations } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Repository for Scene Editing
 * Direct database interactions for scenes and recommendations
 */
export class SceneEditingRepo {
  /**
   * Get current script version for a project
   */
  async getCurrentVersion(projectId: string) {
    const [version] = await db
      .select()
      .from(scriptVersions)
      .where(
        and(
          eq(scriptVersions.projectId, projectId),
          eq(scriptVersions.isCurrent, true)
        )
      )
      .limit(1);

    return version;
  }

  /**
   * Get scene recommendations for a version
   */
  async getRecommendationsByVersionId(versionId: string) {
    const recommendations = await db
      .select()
      .from(sceneRecommendations)
      .where(eq(sceneRecommendations.scriptVersionId, versionId))
      .orderBy(sceneRecommendations.sceneId);

    return recommendations;
  }

  /**
   * Get a specific recommendation by ID
   */
  async getRecommendationById(recommendationId: string) {
    const [recommendation] = await db
      .select()
      .from(sceneRecommendations)
      .where(eq(sceneRecommendations.id, recommendationId))
      .limit(1);

    return recommendation;
  }

  /**
   * Mark recommendation as applied
   */
  async markRecommendationApplied(recommendationId: string) {
    const [recommendation] = await db
      .update(sceneRecommendations)
      .set({ appliedAt: new Date(), applied: true })
      .where(eq(sceneRecommendations.id, recommendationId))
      .returning();

    return recommendation;
  }

  /**
   * Create scene recommendations
   */
  async createRecommendations(recommendations: any[]) {
    if (recommendations.length === 0) return [];

    const created = await db
      .insert(sceneRecommendations)
      .values(recommendations)
      .returning();

    return created;
  }
}
