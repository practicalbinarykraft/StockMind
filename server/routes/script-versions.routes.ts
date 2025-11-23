import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { scriptVersions, sceneRecommendations } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { ScriptVersionService } from "../services/script-version-service";
import { apiResponse } from "../lib/api-response";
import { extractScoreDelta, priorityToConfidence } from "../lib/reco-utils";

const scriptVersionService = new ScriptVersionService(storage);

/**
 * Helper: Extract scene recommendations from advanced analysis
 */
function extractRecommendationsFromAnalysis(analysis: any, totalScenes: number): any[] {
  const recommendations: any[] = [];

  if (!analysis || !analysis.recommendations) {
    console.log('[Extract Recommendations] No recommendations found in analysis');
    return recommendations;
  }

  console.log(`[Extract Recommendations] Processing ${analysis.recommendations.length} recommendations for ${totalScenes} scenes`);

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
        priority: rec.priority || 'medium',
        area: rec.area || 'general',
        currentText: rec.current || '',
        suggestedText: rec.suggested || '',
        reasoning: rec.reasoning || '',
        expectedImpact: rec.expectedImpact || '',
        sourceAgent: rec.area || 'general',
        scoreDelta,
        confidence,
      });

      console.log(`[Extract Recommendations] Added recommendation for scene #${sceneNumber}, area: ${rec.area}, priority: ${rec.priority}`);
    } else {
      console.log(`[Extract Recommendations] Skipped recommendation - invalid sceneNumber: ${sceneNumber} (total scenes: ${totalScenes})`);
    }
  }

  console.log(`[Extract Recommendations] Extracted ${recommendations.length} valid recommendations`);
  return recommendations;
}

/**
 * Script Version Management routes
 * Handles version history, CRUD operations, and version restoration
 */
export function registerScriptVersionsRoutes(app: Express) {

  /**
   * GET /api/projects/:id/script-history
   * Get script version history and recommendations for a project
   * Single source of truth for script versions and recommendations
   */
  app.get("/api/projects/:id/script-history", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Get all versions
      const versions = await storage.getScriptVersions(id);

      // Get current version
      const currentVersion = versions.find(v => v.isCurrent) || versions[0];

      if (!currentVersion) {
        return apiResponse.ok(res, {
          currentVersion: null,
          versions: [],
          recommendations: [],
          hasUnappliedRecommendations: false,
        });
      }

      // Get recommendations for current version
      const recommendations = await storage.getSceneRecommendations(currentVersion.id);

      return apiResponse.ok(res, {
        currentVersion,
        versions,
        recommendations,
        hasUnappliedRecommendations: recommendations.some(r => !r.applied),
      });
    } catch (error: any) {
      console.error('[Script History] Error:', error);
      return apiResponse.serverError(res, error.message, error);
    }
  });

  /**
   * GET /api/projects/:id/script-versions
   * Get all script versions for frontend
   */
  app.get("/api/projects/:id/script-versions", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const versions = await storage.listScriptVersions(id);
      return res.json({ versions });
    } catch (error: any) {
      console.error('[Script Versions] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  /**
   * GET /api/projects/:id/versions/:versionId
   * Get a specific version by ID
   */
  app.get("/api/projects/:id/versions/:versionId", requireAuth, async (req: any, res) => {
    try {
      const { id: projectId, versionId } = req.params;
      const userId = getUserId(req);

      const project = await storage.getProjectById(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const version = await storage.getScriptVersionById(versionId);
      if (!version || version.projectId !== projectId) {
        return apiResponse.notFound(res, "Version not found");
      }

      return apiResponse.ok(res, { version });
    } catch (error: any) {
      console.error('[Get Version] Error:', error);
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * POST /api/projects/:id/create-initial-version
   * Create initial script version from analysis
   */
  app.post("/api/projects/:id/create-initial-version", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { scenes, analysisResult, analysisScore } = req.body;
      const userId = getUserId(req);

      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Check if version already exists
      const existingVersion = await storage.getCurrentScriptVersion(id);
      if (existingVersion) {
        return apiResponse.ok(res, {
          version: existingVersion,
          message: 'Version already exists',
        });
      }

      // Create initial version
      const newVersion = await scriptVersionService.createVersion({
        projectId: id,
        scenes,
        createdBy: 'system',
        changes: {
          type: 'initial',
          description: 'Initial version from AI analysis',
        },
        analysisResult,
        analysisScore,
      });

      // Extract and create recommendations
      const recommendationsData = extractRecommendationsFromAnalysis(analysisResult, scenes);

      if (recommendationsData.length > 0) {
        const recommendations = recommendationsData.map(rec => ({
          ...rec,
          scriptVersionId: newVersion.id,
        }));

        await storage.createSceneRecommendations(recommendations);
      }

      return apiResponse.ok(res, {
        version: newVersion,
        recommendationsCount: recommendationsData.length,
      });
    } catch (error: any) {
      console.error('[Create Initial Version] Error:', error);
      return apiResponse.serverError(res, error.message, error);
    }
  });

  /**
   * PUT /api/projects/:id/versions/:versionId/accept
   * Accept candidate version and make it current
   */
  app.put("/api/projects/:id/versions/:versionId/accept", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId, versionId } = req.params;

      // Validate project exists
      const project = await storage.getProject(projectId, userId);
      if (!project) return apiResponse.notFound(res, "Project not found");

      // Get the version to accept
      const versions = await storage.getScriptVersions(projectId);
      const versionToAccept = versions.find(v => v.id === versionId);

      if (!versionToAccept) {
        return apiResponse.notFound(res, "Version not found");
      }

      if (!versionToAccept.isCandidate) {
        return apiResponse.badRequest(res, "Can only accept candidate versions");
      }

      // Transaction: set all is_current=false, then set this one to current
      await db.transaction(async (tx) => {
        // Clear all current flags
        await tx.update(scriptVersions)
          .set({ isCurrent: false })
          .where(eq(scriptVersions.projectId, projectId));

        // Set this version as current (no longer candidate)
        await tx.update(scriptVersions)
          .set({
            isCurrent: true,
            isCandidate: false,
          })
          .where(eq(scriptVersions.id, versionId));
      });

      console.log(`[Accept Version] Accepted candidate ${versionId} as current version`);

      // Return updated versions list
      const updatedVersions = await storage.getScriptVersions(projectId);
      const currentVersion = updatedVersions.find(v => v.isCurrent);
      const recommendations = currentVersion
        ? await storage.getSceneRecommendations(currentVersion.id)
        : [];

      return apiResponse.ok(res, {
        currentVersion,
        versions: updatedVersions,
        recommendations,
        message: "Version accepted successfully"
      });

    } catch (error: any) {
      console.error("[Accept Version] Error:", error);
      return apiResponse.serverError(res, error.message || "Failed to accept version");
    }
  });

  /**
   * DELETE /api/projects/:id/versions/:versionId
   * Delete/reject candidate version
   */
  app.delete("/api/projects/:id/versions/:versionId", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId, versionId } = req.params;

      // Validate project exists
      const project = await storage.getProject(projectId, userId);
      if (!project) return apiResponse.notFound(res, "Project not found");

      // Get the version to delete
      const versions = await storage.getScriptVersions(projectId);
      const versionToDelete = versions.find(v => v.id === versionId);

      if (!versionToDelete) {
        return apiResponse.notFound(res, "Version not found");
      }

      if (versionToDelete.isCurrent) {
        return apiResponse.badRequest(res, "Cannot delete current version");
      }

      // Delete version and its recommendations
      await db.transaction(async (tx) => {
        await tx.delete(sceneRecommendations)
          .where(eq(sceneRecommendations.scriptVersionId, versionId));

        await tx.delete(scriptVersions)
          .where(eq(scriptVersions.id, versionId));
      });

      console.log(`[Delete Version] Deleted version ${versionId}`);

      // Return updated versions list
      const updatedVersions = await storage.getScriptVersions(projectId);
      const currentVersion = updatedVersions.find(v => v.isCurrent);
      const recommendations = currentVersion
        ? await storage.getSceneRecommendations(currentVersion.id)
        : [];

      return apiResponse.ok(res, {
        currentVersion,
        versions: updatedVersions,
        recommendations,
        message: "Version deleted successfully"
      });

    } catch (error: any) {
      console.error("[Delete Version] Error:", error);
      return apiResponse.serverError(res, error.message || "Failed to delete version");
    }
  });
}

export { extractRecommendationsFromAnalysis };
