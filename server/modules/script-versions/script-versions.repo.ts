import { db } from "../../db";
import { scriptVersions, sceneRecommendations } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Repository for Script Versions
 * Direct database interactions for script versions and recommendations
 */
export class ScriptVersionsRepo {
  /**
   * Get all script versions for a project
   */
  async getVersionsByProjectId(projectId: string) {
    const versions = await db
      .select()
      .from(scriptVersions)
      .where(eq(scriptVersions.projectId, projectId))
      .orderBy(desc(scriptVersions.createdAt));

    return versions;
  }

  /**
   * Get a specific version by ID
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
   * Get current version for a project
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
   * Clear all current flags for a project
   */
  async clearCurrentFlags(projectId: string) {
    await db
      .update(scriptVersions)
      .set({ isCurrent: false })
      .where(eq(scriptVersions.projectId, projectId));
  }

  /**
   * Set version as current and remove candidate flag
   */
  async setVersionAsCurrent(versionId: string) {
    const [version] = await db
      .update(scriptVersions)
      .set({
        isCurrent: true,
        isCandidate: false,
      })
      .where(eq(scriptVersions.id, versionId))
      .returning();

    return version;
  }

  /**
   * Delete recommendations for a version
   */
  async deleteRecommendations(versionId: string) {
    await db
      .delete(sceneRecommendations)
      .where(eq(sceneRecommendations.scriptVersionId, versionId));
  }

  /**
   * Delete a version
   */
  async deleteVersion(versionId: string) {
    const [version] = await db
      .delete(scriptVersions)
      .where(eq(scriptVersions.id, versionId))
      .returning();

    return version;
  }

  /**
   * List all script versions for a project (compatible with storage interface)
   */
  async listScriptVersions(projectId: string) {
    return this.getVersionsByProjectId(projectId);
  }

  /**
   * Accept version transaction: clear all current flags and set new current
   */
  async acceptVersionTransaction(projectId: string, versionId: string) {
    await db.transaction(async (tx) => {
      await this.clearCurrentFlags(projectId);
      await this.setVersionAsCurrent(versionId);
    });
  }

  /**
   * Delete version with recommendations transaction
   */
  async deleteVersionWithRecommendations(versionId: string) {
    await db.transaction(async (tx) => {
      await this.deleteRecommendations(versionId);
      await this.deleteVersion(versionId);
    });
  }
}
