import { VersionComparisonRepo } from "./version-comparison.repo";
import { storage } from "../../storage";
import { logger } from "../../lib/logger";
import {
  VersionNotFoundError,
  MissingCurrentVersionError,
  MissingCandidateVersionError,
  NoCandidateVersionError,
} from "./version-comparison.errors";

const repo = new VersionComparisonRepo();

/**
 * Version Comparison Service
 * Business logic for version comparison and selection
 */
export const versionComparisonService = {
  /**
   * Compare two specific versions by ID
   */
  async compareVersions(
    projectId: string,
    baseVersionId: string,
    targetVersionId: string
  ) {
    // Get specific versions
    const baseVersion = await repo.getVersionById(baseVersionId);
    const targetVersion = await repo.getVersionById(targetVersionId);

    if (!baseVersion || !targetVersion) {
      throw new VersionNotFoundError();
    }

    // Check if versions belong to this project
    if (
      baseVersion.projectId !== projectId ||
      targetVersion.projectId !== projectId
    ) {
      throw new VersionNotFoundError();
    }

    // Check target version analysis status
    const targetMetrics = targetVersion.metrics as any;
    const analysisStatus = targetMetrics ? "done" : "running";

    // Extract base metrics
    const baseMetrics = (baseVersion.metrics as any) || {};
    const baseScore =
      baseMetrics.overallScore || baseVersion.analysisScore || 0;
    const baseBreakdown = {
      hook: baseMetrics.hookScore || 0,
      structure: baseMetrics.structureScore || 0,
      emotional: baseMetrics.emotionalScore || 0,
      cta: baseMetrics.ctaScore || 0,
    };

    // Extract target metrics (may be null if analysis not done)
    const targetScore =
      targetMetrics?.overallScore || targetVersion.analysisScore || 0;
    const targetBreakdown = {
      hook: targetMetrics?.hookScore || 0,
      structure: targetMetrics?.structureScore || 0,
      emotional: targetMetrics?.emotionalScore || 0,
      cta: targetMetrics?.ctaScore || 0,
    };

    // Calculate deltas ONLY if analysis is done
    const delta =
      analysisStatus === "done"
        ? {
            overall: targetScore - baseScore,
            hook: targetBreakdown.hook - baseBreakdown.hook,
            structure: targetBreakdown.structure - baseBreakdown.structure,
            emotional: targetBreakdown.emotional - baseBreakdown.emotional,
            cta: targetBreakdown.cta - baseBreakdown.cta,
          }
        : {
            overall: null,
            hook: null,
            structure: null,
            emotional: null,
            cta: null,
          };

    // Format scenes
    const formatScenes = (scenes: any[]) =>
      (scenes || []).map((scene: any) => ({
        id: scene.sceneNumber,
        text: scene.text,
      }));

    return {
      status: analysisStatus,
      base: {
        id: baseVersion.id,
        overall: baseScore,
        breakdown: baseBreakdown,
        review: baseVersion.review || "Рецензия не доступна",
        scenes: formatScenes(baseVersion.scenes as any[]),
      },
      candidate: {
        id: targetVersion.id,
        overall: targetScore,
        breakdown: targetBreakdown,
        review:
          targetVersion.review ||
          (analysisStatus === "running"
            ? "Идёт анализ..."
            : "Рецензия не доступна"),
        scenes: formatScenes(targetVersion.scenes as any[]),
      },
      delta,
    };
  },

  /**
   * Get comparison data for current vs candidate version
   */
  async compareLatest(projectId: string) {
    // Get current and candidate versions
    const currentVersion = await repo.getCurrentVersion(projectId);
    const candidateVersion = await repo.getLatestCandidateVersion(projectId);

    if (!currentVersion || !candidateVersion) {
      if (!currentVersion && candidateVersion) {
        throw new MissingCurrentVersionError();
      }
      if (currentVersion && !candidateVersion) {
        throw new MissingCandidateVersionError();
      }
      throw new Error("Missing current and candidate version");
    }

    // Extract metrics
    const baseMetrics = (currentVersion.metrics as any) || {};
    const candidateMetrics = (candidateVersion.metrics as any) || {};

    // Check candidate analysis status
    const analysisStatus = candidateMetrics.overallScore ? "done" : "running";

    const baseScore =
      baseMetrics.overallScore || currentVersion.analysisScore || 0;
    const candidateScore =
      candidateMetrics.overallScore || candidateVersion.analysisScore || 0;

    // Extract breakdown scores
    const baseBreakdown = {
      hook: baseMetrics.hookScore || 0,
      structure: baseMetrics.structureScore || 0,
      emotional: baseMetrics.emotionalScore || 0,
      cta: baseMetrics.ctaScore || 0,
    };

    const candidateBreakdown = {
      hook: candidateMetrics.hookScore || 0,
      structure: candidateMetrics.structureScore || 0,
      emotional: candidateMetrics.emotionalScore || 0,
      cta: candidateMetrics.ctaScore || 0,
    };

    // Calculate deltas ONLY if analysis is done
    const delta =
      analysisStatus === "done"
        ? {
            overall: candidateScore - baseScore,
            hook: candidateBreakdown.hook - baseBreakdown.hook,
            structure: candidateBreakdown.structure - baseBreakdown.structure,
            emotional: candidateBreakdown.emotional - baseBreakdown.emotional,
            cta: candidateBreakdown.cta - baseBreakdown.cta,
          }
        : {
            overall: null,
            hook: null,
            structure: null,
            emotional: null,
            cta: null,
          };

    // Format response
    const formatVersion = (
      version: any,
      metrics: any,
      breakdown: any,
      isCandidate: boolean
    ) => {
      const scenes = (version.scenes || []).map((scene: any) => ({
        id: scene.sceneNumber,
        text: scene.text,
      }));

      return {
        id: version.id,
        overall: metrics.overallScore || version.analysisScore || 0,
        breakdown,
        review:
          version.review ||
          (isCandidate && analysisStatus === "running"
            ? "Идёт анализ..."
            : "Рецензия не доступна"),
        scenes,
      };
    };

    return {
      status: analysisStatus,
      base: formatVersion(currentVersion, baseMetrics, baseBreakdown, false),
      candidate: formatVersion(
        candidateVersion,
        candidateMetrics,
        candidateBreakdown,
        true
      ),
      delta,
    };
  },

  /**
   * Choose which version to keep (base or candidate)
   */
  async chooseVersion(projectId: string, keep: "base" | "candidate") {
    // Get versions
    const currentVersion = await repo.getCurrentVersion(projectId);
    const candidateVersion = await repo.getLatestCandidateVersion(projectId);

    if (!currentVersion || !candidateVersion) {
      throw new Error("Missing current or candidate version");
    }

    if (keep === "candidate") {
      // Promote candidate to current
      await storage.promoteCandidate(projectId, candidateVersion.id);
      logger.info("Promoted candidate to current", {
        candidateId: candidateVersion.id,
      });
    } else {
      // Reject candidate
      await storage.rejectCandidate(projectId, candidateVersion.id);
      logger.info("Rejected candidate version", {
        candidateId: candidateVersion.id,
      });
    }

    return {
      success: true,
      choice: keep,
    };
  },

  /**
   * Cancel/reject candidate draft
   */
  async cancelCandidate(projectId: string) {
    // Get candidate version
    const candidateVersion = await repo.getLatestCandidateVersion(projectId);

    if (!candidateVersion) {
      throw new NoCandidateVersionError();
    }

    // Reject candidate
    await storage.rejectCandidate(projectId, candidateVersion.id);
    logger.info("Cancelled candidate draft", {
      candidateId: candidateVersion.id,
      projectId,
    });

    return {
      success: true,
      message: "Candidate draft cancelled",
    };
  },
};
