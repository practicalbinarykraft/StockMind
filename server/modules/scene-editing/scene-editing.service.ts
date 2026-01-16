import { SceneEditingRepo } from "./scene-editing.repo";
import { storage } from "../../storage";
import { ScriptVersionService } from "../../services/script-version-service";
import { apiKeysService } from "../api-keys/api-keys.service";
import { ProjectsService } from "../projects/projects.service";
import { logger } from "../../lib/logger";
import { analyzeScriptAdvanced } from "../../ai-services/advanced";
import { generateSceneRecommendations } from "../../ai-services/scene-recommendations";
import {
  ScriptVersionNotFoundError,
  RecommendationNotFoundError,
  SceneNotFoundError,
  NoApiKeyConfiguredError,
} from "./scene-editing.errors";

const repo = new SceneEditingRepo();
const scriptVersionService = new ScriptVersionService(storage);
const projectsService = new ProjectsService();

/**
 * Scene Editing Service
 * Business logic for scene editing and recommendations
 */
export const sceneEditingService = {
  /**
   * Get scene recommendations for current version
   */
  async getSceneRecommendations(projectId: string) {
    const currentVersion = await repo.getCurrentVersion(projectId);
    if (!currentVersion) {
      return [];
    }

    const recommendations = await repo.getRecommendationsByVersionId(
      currentVersion.id
    );

    // Transform to match SceneEditor interface
    return recommendations.map((r) => ({
      id: r.id,
      sceneId: r.sceneId,
      priority: r.priority,
      area: r.area,
      currentText: r.currentText,
      suggestedText: r.suggestedText,
      reasoning: r.reasoning,
      expectedImpact: r.expectedImpact,
      appliedAt: r.appliedAt,
    }));
  },

  /**
   * Apply single scene recommendation
   */
  async applySceneRecommendation(
    projectId: string,
    recommendationId: string,
    userId: string
  ) {
    // Get current version
    const currentVersion = await repo.getCurrentVersion(projectId);
    if (!currentVersion) {
      throw new ScriptVersionNotFoundError();
    }

    // Get recommendation
    const recommendation = await repo.getRecommendationById(recommendationId);
    if (!recommendation) {
      throw new RecommendationNotFoundError();
    }

    // Get sceneId from recommendation
    const sceneNumber = recommendation.sceneId;

    // Clone current scenes and apply recommendation
    const scenes = JSON.parse(JSON.stringify(currentVersion.scenes));
    const targetScene = scenes.find((s: any) => s.sceneNumber === sceneNumber);

    if (!targetScene) {
      throw new SceneNotFoundError();
    }

    const oldText = targetScene.text;
    targetScene.text = recommendation.suggestedText;
    targetScene.recommendationApplied = true;
    targetScene.lastModified = new Date().toISOString();

    // Create new version with provenance
    const newVersion = await scriptVersionService.createVersion({
      projectId,
      scenes,
      createdBy: "ai",
      changes: {
        type: "scene_recommendation",
        affectedScenes: [sceneNumber],
        sceneId: sceneNumber,
        before: oldText,
        after: recommendation.suggestedText,
        reason: recommendation.reasoning,
      },
      parentVersionId: currentVersion.id,
      analysisResult: currentVersion.analysisResult,
      analysisScore: currentVersion.analysisScore ?? undefined,
      provenance: {
        source: "ai_recommendation",
        agent: recommendation.sourceAgent || recommendation.area || "general",
        userId: userId,
        ts: new Date().toISOString(),
      },
      userId: userId,
    });

    // Mark recommendation as applied
    await repo.markRecommendationApplied(recommendationId);

    // Copy all unapplied recommendations to new version
    const allRecommendations = await repo.getRecommendationsByVersionId(
      currentVersion.id
    );
    const unappliedRecs = allRecommendations.filter(
      (r) => r.id !== recommendationId && !r.appliedAt
    );

    if (unappliedRecs.length > 0) {
      const newRecs = unappliedRecs.map((r) => ({
        scriptVersionId: newVersion.id,
        sceneId: r.sceneId,
        priority: r.priority,
        area: r.area,
        currentText: r.currentText,
        suggestedText: r.suggestedText,
        reasoning: r.reasoning,
        expectedImpact: r.expectedImpact,
        scoreDelta: r.scoreDelta,
        confidence: r.confidence,
        sourceAgent: r.sourceAgent,
      }));
      await repo.createRecommendations(newRecs);
    }

    return {
      success: true,
      data: {
        affectedScene: {
          sceneNumber: sceneNumber,
          text: targetScene.text,
        },
        needsReanalysis: true,
      },
    };
  },

  /**
   * Apply all recommendations (or specific ones)
   */
  async applyAllRecommendations(
    projectId: string,
    userId: string,
    recommendationIds?: string[]
  ) {
    const result = await scriptVersionService.applyAllRecommendations({
      projectId,
      userId,
      recommendationIds,
    });

    return result;
  },

  /**
   * Edit scene manually
   */
  async editScene(
    projectId: string,
    sceneId: number,
    newText: string,
    userId: string
  ) {
    const result = await scriptVersionService.applySceneEdit({
      projectId,
      sceneId,
      newText,
      userId,
    });

    return result;
  },

  /**
   * Revert to previous version
   */
  async revertToVersion(projectId: string, versionId: string, userId: string) {
    const result = await scriptVersionService.revertToVersion({
      projectId,
      versionId,
      userId,
    });

    return result;
  },

  /**
   * Run analysis on scenes and generate recommendations
   */
  async runAnalysis(projectId: string, scenes: any[], userId: string) {
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      throw new Error("Scenes array is required");
    }

    // Get project
    const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Get API key
    const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
    if (!apiKey) {
      throw new NoApiKeyConfiguredError("Anthropic");
    }

    logger.info(
      `[Analysis Run] Analyzing ${scenes.length} scenes for project ${projectId}`
    );

    // Combine scenes into full script text
    const fullScript = scenes
      .sort((a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0))
      .map((s) => s.text)
      .join("\n\n");

    // Run advanced analysis
    const startTime = Date.now();
    const analysis = await analyzeScriptAdvanced(
      apiKey.decryptedKey,
      fullScript,
      "custom_script"
    );
    const analysisTime = Date.now() - startTime;

    logger.info(`[Analysis Run] Analysis completed in ${analysisTime}ms`, {
      overallScore: analysis.overallScore,
      projectId,
    });

    // Generate scene recommendations
    const recommendations = await generateSceneRecommendations(
      apiKey.decryptedKey,
      scenes.map((s) => ({
        sceneNumber: s.sceneNumber || 0,
        text: s.text,
      })),
      {
        format: project.sourceType === "news" ? "news_update" : "short-form",
        language: "ru",
      }
    );

    logger.info(`[Analysis Run] Generated ${recommendations.length} recommendations`);

    // Get current version to check cache
    const currentVersion = await repo.getCurrentVersion(projectId);
    const cached =
      currentVersion?.metrics &&
      (currentVersion.metrics as any).overallScore === analysis.overallScore;

    // Map recommendations to match client interface
    const mappedRecommendations = recommendations.map((r, index) => ({
      id: index + 1,
      sceneId: r.sceneNumber,
      priority: r.priority as "critical" | "high" | "medium" | "low",
      area: r.area,
      currentText: r.current,
      suggestedText: r.suggested,
      reasoning: r.reasoning,
      expectedImpact: r.expectedImpact,
      scoreDelta: r.delta,
      confidence: undefined,
    }));

    return {
      analysis: {
        overallScore: analysis.overallScore,
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        hookScore: analysis.hookScore,
        structureScore: analysis.structureScore,
        emotionalScore: analysis.emotionalScore,
        ctaScore: analysis.ctaScore,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
      },
      recommendations: mappedRecommendations,
      cached,
      metadata: {
        analysisTime,
        timestamp: new Date().toISOString(),
      },
    };
  },
};
