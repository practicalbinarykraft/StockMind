import { ScriptVersionsRepo } from "./script-versions.repo";
import { logger } from "../../lib/logger";
import { extractScoreDelta, priorityToConfidence } from "../../lib/reco-utils";
import {
  ScriptVersionNotFoundError,
  CannotDeleteCurrentVersionError,
  CanOnlyAcceptCandidateVersionsError,
} from "./script-versions.errors";

const repo = new ScriptVersionsRepo();

/**
 * Helper types
 * Exported for use in other services
 */
export interface CreateVersionData {
  projectId: string;
  scenes: any[];
  createdBy: "user" | "ai" | "system";
  changes: any;
  parentVersionId?: string;
  analysisResult?: any;
  analysisScore?: number;
  provenance?: any;
  diff?: any[];
  userId?: string;
}

/**
 * Create a new script version
 * Exported for use in other services (e.g., scene-editing.service.ts)
 */
export async function createVersion(data: CreateVersionData) {
  const {
    projectId,
    scenes,
    createdBy,
    changes,
    parentVersionId,
    analysisResult,
    analysisScore,
    provenance,
    diff,
    userId,
  } = data;

  // Get next version number
  const versions = await repo.getVersionsByProjectId(projectId);
  const nextVersion =
    versions.length > 0
      ? Math.max(...versions.map((v) => v.versionNumber)) + 1
      : 1;

  // Build full script text
  const fullScript = Array.isArray(scenes)
    ? scenes
        .map((s: any) => {
          const start = s.start || 0;
          const end = s.end || s.duration || 0;
          return `[${start}-${end}s] ${s.text}`;
        })
        .join("\n")
    : "";

  // Get current version for diff calculation
  const currentVersion = await repo.getCurrentVersion(projectId);

  // Calculate diff if not provided
  let finalDiff = diff;
  if (!finalDiff && currentVersion && currentVersion.scenes) {
    // Simple diff calculation
    finalDiff = [];
  }

  // Build provenance if not provided
  let finalProvenance = provenance;
  if (!finalProvenance) {
    finalProvenance = {
      source: changes?.type || "unknown",
      userId: userId,
      ts: new Date().toISOString(),
    };
  }

  // Create new version using repo method
  const newVersion = await repo.createScriptVersionAtomic({
    projectId,
    versionNumber: nextVersion,
    fullScript,
    scenes,
    changes,
    createdBy,
    isCurrent: true,
    parentVersionId,
    analysisResult,
    analysisScore,
    provenance: finalProvenance,
    diff: finalDiff,
  });

  return newVersion;
}

/**
 * Helper: Extract scene recommendations from advanced analysis
 */
function extractRecommendationsFromAnalysis(
  analysis: any,
  totalScenes: number
): any[] {
  const recommendations: any[] = [];

  if (!analysis || !analysis.recommendations) {
    logger.debug("No recommendations found in analysis");
    return recommendations;
  }

  logger.debug("Processing recommendations", {
    count: analysis.recommendations.length,
    totalScenes,
  });

  // Map recommendations to scenes using scene numbers (1-indexed)
  for (const rec of analysis.recommendations) {
    const sceneNumber = rec.sceneNumber;

    if (sceneNumber && sceneNumber > 0 && sceneNumber <= totalScenes) {
      // Extract score delta from expectedImpact (e.g., "+18 points" → 18)
      const scoreDelta = extractScoreDelta(rec.expectedImpact);

      // Map priority to confidence
      const confidence = priorityToConfidence(rec.priority);

      recommendations.push({
        sceneId: sceneNumber, // sceneId is just the scene number (1, 2, 3...), not a database PK
        priority: rec.priority || "medium",
        area: rec.area || "general",
        currentText: rec.current || "",
        suggestedText: rec.suggested || "",
        reasoning: rec.reasoning || "",
        expectedImpact: rec.expectedImpact || "",
        sourceAgent: rec.area || "general",
        scoreDelta,
        confidence,
      });

      logger.debug("Added recommendation", {
        sceneNumber,
        area: rec.area,
        priority: rec.priority,
      });
    } else {
      logger.debug("Skipped recommendation - invalid sceneNumber", {
        sceneNumber,
        totalScenes,
      });
    }
  }

  logger.debug("Extracted valid recommendations", {
    count: recommendations.length,
  });
  return recommendations;
}

/**
 * Script Versions Service
 * Business logic for script version management
 */
export const scriptVersionsService = {
  /**
   * Get script history and recommendations for a project
   */
  async getScriptHistory(projectId: string) {
    // Get all versions
    const versions = await repo.getVersionsByProjectId(projectId);

    // Get current version
    const currentVersion = versions.find((v) => v.isCurrent) || versions[0];

    if (!currentVersion) {
      return {
        currentVersion: null,
        versions: [],
        recommendations: [],
        hasUnappliedRecommendations: false,
      };
    }

    // Get recommendations for current version
    const recommendations = await repo.getRecommendationsByVersionId(
      currentVersion.id
    );

    return {
      currentVersion,
      versions,
      recommendations,
      hasUnappliedRecommendations: recommendations.some((r) => !r.applied),
    };
  },

  /**
   * Get all versions for a project
   */
  async getVersionsList(projectId: string) {
    const versions = await repo.listScriptVersions(projectId);
    return versions;
  },

  /**
   * Get a specific version by ID
   */
  async getVersionById(versionId: string, projectId: string) {
    const version = await repo.getVersionById(versionId);

    if (!version || version.projectId !== projectId) {
      throw new ScriptVersionNotFoundError();
    }

    return version;
  },

  /**
   * Create initial version from analysis
   */
  async createInitialVersion(
    projectId: string,
    scenes: any,
    analysisResult: any,
    analysisScore?: number
  ) {
    // Check if version already exists
    const existingVersion = await repo.getCurrentVersion(projectId);
    if (existingVersion) {
      return {
        version: existingVersion,
        recommendationsCount: 0,
        alreadyExists: true,
      };
    }

    // Create initial version
    const newVersion = await createVersion({
      projectId,
      scenes,
      createdBy: "system",
      changes: {
        type: "initial",
        description: "Initial version from AI analysis",
      },
      analysisResult,
      analysisScore,
    });

    // Extract and create recommendations
    const recommendationsData = extractRecommendationsFromAnalysis(
      analysisResult,
      scenes
    );

    if (recommendationsData.length > 0) {
      const recommendations = recommendationsData.map((rec) => ({
        ...rec,
        scriptVersionId: newVersion.id,
      }));

      await repo.createRecommendations(recommendations);
    }

    return {
      version: newVersion,
      recommendationsCount: recommendationsData.length,
      alreadyExists: false,
    };
  },

  /**
   * Accept a candidate version and make it current
   */
  async acceptVersion(projectId: string, versionId: string) {
    // Get the version to accept
    const versions = await repo.getVersionsByProjectId(projectId);
    const versionToAccept = versions.find((v) => v.id === versionId);

    if (!versionToAccept) {
      throw new ScriptVersionNotFoundError();
    }

    if (!versionToAccept.isCandidate) {
      throw new CanOnlyAcceptCandidateVersionsError();
    }

    // Transaction: set all is_current=false, then set this one to current
    await repo.acceptVersionTransaction(projectId, versionId);

    logger.info("Accepted candidate as current version", { versionId });

    // Return updated versions list
    const updatedVersions = await repo.getVersionsByProjectId(projectId);
    const currentVersion = updatedVersions.find((v) => v.isCurrent);
    const recommendations = currentVersion
      ? await repo.getRecommendationsByVersionId(currentVersion.id)
      : [];

    return {
      currentVersion,
      versions: updatedVersions,
      recommendations,
    };
  },

  /**
   * Delete/reject a candidate version
   */
  async deleteVersion(projectId: string, versionId: string) {
    // Get the version to delete
    const versions = await repo.getVersionsByProjectId(projectId);
    const versionToDelete = versions.find((v) => v.id === versionId);

    if (!versionToDelete) {
      throw new ScriptVersionNotFoundError();
    }

    if (versionToDelete.isCurrent) {
      throw new CannotDeleteCurrentVersionError();
    }

    // Delete version and its recommendations in transaction
    await repo.deleteVersionWithRecommendations(versionId);

    logger.info("Deleted script version", { versionId });

    // Return updated versions list
    const updatedVersions = await repo.getVersionsByProjectId(projectId);
    const currentVersion = updatedVersions.find((v) => v.isCurrent);
    const recommendations = currentVersion
      ? await repo.getRecommendationsByVersionId(currentVersion.id)
      : [];

    return {
      currentVersion,
      versions: updatedVersions,
      recommendations,
    };
  },
};

export { extractRecommendationsFromAnalysis };
