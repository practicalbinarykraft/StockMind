import { db } from "../../db";
import { scriptVersions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Repository for Version Comparison
 * Direct database interactions for version comparison
 */
export class VersionComparisonRepo {
  /**
   * Get script version by ID
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
   * Get latest candidate version for a project
   */
  async getLatestCandidateVersion(projectId: string) {
    const [version] = await db
      .select()
      .from(scriptVersions)
      .where(
        and(
          eq(scriptVersions.projectId, projectId),
          eq(scriptVersions.isCandidate, true)
        )
      )
      .orderBy(scriptVersions.createdAt)
      .limit(1);

    return version;
  }
}
