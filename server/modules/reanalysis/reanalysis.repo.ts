import { db } from "../../db";
import { scriptVersions, sceneRecommendations } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Repository for Reanalysis
 * Direct database interactions for reanalysis operations
 */
export class ReanalysisRepo {
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
   * Get existing candidate versions for a project
   */
  async getExistingCandidates(projectId: string) {
    const candidates = await db
      .select()
      .from(scriptVersions)
      .where(
        and(
          eq(scriptVersions.projectId, projectId),
          eq(scriptVersions.isCandidate, true)
        )
      );

    return candidates;
  }

  /**
   * Delete candidate version and its recommendations
   */
  async deleteCandidateWithRecommendations(candidateId: string) {
    await db.transaction(async (tx) => {
      await tx
        .delete(sceneRecommendations)
        .where(eq(sceneRecommendations.scriptVersionId, candidateId));

      await tx.delete(scriptVersions).where(eq(scriptVersions.id, candidateId));
    });
  }

  /**
   * Get next version number for a project
   */
  async getNextVersionNumber(projectId: string) {
    const maxResult = await db
      .select({
        max: sql<number>`COALESCE(MAX(${scriptVersions.versionNumber}), 0)`,
      })
      .from(scriptVersions)
      .where(eq(scriptVersions.projectId, projectId));

    return (maxResult[0]?.max || 0) + 1;
  }

  /**
   * Create candidate version
   */
  async createCandidateVersion(data: any) {
    const [candidate] = await db
      .insert(scriptVersions)
      .values(data)
      .returning();

    return candidate;
  }
}
