import { db } from "../../db";
import { scriptVersions, sceneRecommendations } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

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
   * Get all script versions for a project
   */
  async getVersionsByProjectId(projectId: string) {
    const versions = await db
      .select()
      .from(scriptVersions)
      .where(eq(scriptVersions.projectId, projectId))
      .orderBy(desc(scriptVersions.versionNumber));

    return versions;
  }

  /**
   * Get version by ID
   */
  async getVersionById(versionId: string) {
    const [version] = await db
      .select()
      .from(scriptVersions)
      .where(eq(scriptVersions.id, versionId))
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
   * Mark multiple recommendations as applied
   */
  async markRecommendationsAppliedBatch(recommendationIds: string[]) {
    if (recommendationIds.length === 0) return;

    await db
      .update(sceneRecommendations)
      .set({ appliedAt: new Date(), applied: true })
      .where(sql`${sceneRecommendations.id} IN ${recommendationIds}`);
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

  /**
   * Clear all current flags for a project (used in transaction)
   */
  async clearCurrentFlags(projectId: string) {
    await db
      .update(scriptVersions)
      .set({ isCurrent: false })
      .where(eq(scriptVersions.projectId, projectId));
  }

  /**
   * Create new script version atomically
   */
  async createScriptVersionAtomic(data: {
    projectId: string;
    versionNumber: number;
    fullScript: string;
    scenes: any[];
    changes: any;
    createdBy: string;
    isCurrent: boolean;
    parentVersionId?: string;
    analysisResult?: any;
    analysisScore?: number;
    provenance?: any;
    diff?: any[];
  }) {
    const [newVersion] = await db.transaction(async (tx) => {
      // Clear all current flags
      await tx
        .update(scriptVersions)
        .set({ isCurrent: false })
        .where(eq(scriptVersions.projectId, data.projectId));

      // Create new version
      return await tx
        .insert(scriptVersions)
        .values(data)
        .returning();
    });

    return newVersion;
  }
}
