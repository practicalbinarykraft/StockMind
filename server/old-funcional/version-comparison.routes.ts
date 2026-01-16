import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { apiResponse } from "../lib/api-response";
import { logger } from "../lib/logger";

/**
 * Version Comparison routes
 * Handles version comparison and selection workflow
 */
export function registerVersionComparisonRoutes(app: Express) {
  /**
   * GET /api/projects/:id/compare
   * Compare two specific versions by ID
   */
  app.get("/api/projects/:id/compare", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = req.params;
      const { baseVersionId, targetVersionId } = req.query;

      if (!baseVersionId || !targetVersionId) {
        return apiResponse.badRequest(
          res,
          "baseVersionId and targetVersionId are required"
        );
      }

      // Validate project
      const project = await storage.getProject(projectId, userId);
      if (!project) return apiResponse.notFound(res, "Project not found");

      // Get specific versions
      const baseVersion = await storage.getScriptVersionById(
        baseVersionId as string
      );
      const targetVersion = await storage.getScriptVersionById(
        targetVersionId as string
      );

      if (!baseVersion || !targetVersion) {
        return apiResponse.notFound(res, "Version not found");
      }

      // Check if versions belong to this project
      if (
        baseVersion.projectId !== projectId ||
        targetVersion.projectId !== projectId
      ) {
        return res.status(403).json({ message: "Forbidden" });
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

      return apiResponse.ok(res, {
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
      });
    } catch (error: any) {
      logger.error("Compare Versions error", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * GET /api/projects/:id/reanalyze/compare/latest
   * Get comparison data for current vs candidate version (used in modal)
   */
  app.get(
    "/api/projects/:id/reanalyze/compare/latest",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) return apiResponse.unauthorized(res);

        const { id: projectId } = req.params;

        // Validate project
        const project = await storage.getProject(projectId, userId);
        if (!project) return apiResponse.notFound(res, "Project not found");

        // Get current and candidate versions
        const currentVersion = await storage.getCurrentScriptVersion(projectId);
        const candidateVersion = await storage.getLatestCandidateVersion(
          projectId
        );

        if (!currentVersion || !candidateVersion) {
          if (!currentVersion && candidateVersion) {
            return apiResponse.badRequest(res, "Missing current version");
          }
          if (currentVersion && !candidateVersion) {
            return apiResponse.badRequest(res, "Missing candidate version");
          } else {
            return apiResponse.badRequest(
              res,
              "Missing current and candidate version"
            );
          }
        }

        // Extract metrics
        const baseMetrics = (currentVersion.metrics as any) || {};
        const candidateMetrics = (candidateVersion.metrics as any) || {};

        // Check candidate analysis status
        const analysisStatus = candidateMetrics.overallScore
          ? "done"
          : "running";

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
                structure:
                  candidateBreakdown.structure - baseBreakdown.structure,
                emotional:
                  candidateBreakdown.emotional - baseBreakdown.emotional,
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

        return apiResponse.ok(res, {
          status: analysisStatus,
          base: formatVersion(
            currentVersion,
            baseMetrics,
            baseBreakdown,
            false
          ),
          candidate: formatVersion(
            candidateVersion,
            candidateMetrics,
            candidateBreakdown,
            true
          ),
          delta,
        });
      } catch (error: any) {
        logger.error("Compare Latest error", { error: error.message });
        return apiResponse.serverError(res, error.message);
      }
    }
  );

  /**
   * POST /api/projects/:id/reanalyze/compare/choose
   * Choose which version to keep (base or candidate)
   */
  app.post(
    "/api/projects/:id/reanalyze/compare/choose",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) return apiResponse.unauthorized(res);

        const { id: projectId } = req.params;
        const { keep } = req.body; // "base" | "candidate"

        if (!keep || !["base", "candidate"].includes(keep)) {
          return apiResponse.badRequest(
            res,
            "keep must be 'base' or 'candidate'"
          );
        }

        // Validate project
        const project = await storage.getProject(projectId, userId);
        if (!project) return apiResponse.notFound(res, "Project not found");

        // Get versions
        const currentVersion = await storage.getCurrentScriptVersion(projectId);
        const candidateVersion = await storage.getLatestCandidateVersion(
          projectId
        );

        if (!currentVersion || !candidateVersion) {
          return apiResponse.badRequest(
            res,
            "Missing current or candidate version"
          );
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

        return apiResponse.ok(res, {
          success: true,
          choice: keep,
        });
      } catch (error: any) {
        logger.error("Compare Choose error", { error: error.message });
        return apiResponse.serverError(res, error.message);
      }
    }
  );

  /**
   * DELETE /api/projects/:id/reanalyze/candidate
   * Cancel/reject candidate draft
   */
  app.delete(
    "/api/projects/:id/reanalyze/candidate",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) return apiResponse.unauthorized(res);

        const { id: projectId } = req.params;

        // Validate project
        const project = await storage.getProject(projectId, userId);
        if (!project) return apiResponse.notFound(res, "Project not found");

        // Get candidate version
        const candidateVersion = await storage.getLatestCandidateVersion(
          projectId
        );

        if (!candidateVersion) {
          return apiResponse.badRequest(res, "No candidate version found");
        }

        // Reject candidate
        await storage.rejectCandidate(projectId, candidateVersion.id);
        logger.info("Cancelled candidate draft", {
          candidateId: candidateVersion.id,
          projectId,
        });

        return apiResponse.ok(res, {
          success: true,
          message: "Candidate draft cancelled",
        });
      } catch (error: any) {
        logger.error("Cancel Candidate error", { error: error.message });
        return apiResponse.serverError(res, error.message);
      }
    }
  );
}
