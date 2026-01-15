import { ProjectsService } from "../projects/projects.service";
import { ProjectsScriptRepo } from "./projects-script.repo";
import { apiKeysService } from "../api-keys/api-keys.service";
import { logger } from "../../lib/logger";
import { analyzeScript, analyzeHook, analyzeStructure, analyzeEmotionalImpact, analyzeCTA, synthesizeAnalysis } from "../../ai-services";
import { extractScoreDelta, priorityToConfidence } from "../../lib/reco-utils";
import { extractProjectContent, FORMAT_NAME_MAP } from "../../routes/projects/helpers";
import {
  ProjectNotFoundError,
  NoContentFoundError,
  ApiKeyNotConfiguredError,
  FormatIdRequiredError,
  NoScenesGeneratedError,
} from "./projects-script.errors";
import type { GenerateScriptBodyDto } from "./projects-script.dto";

const projectsService = new ProjectsService();
const projectsScriptRepo = new ProjectsScriptRepo();

/**
 * Projects Script Service
 * Вся бизнес-логика генерации скриптов для проектов
 */
export class ProjectsScriptService {
  /**
   * Построение сцен с таймингом
   */
  private buildScenesWithTiming(rawScenes: any[]): any[] {
    let currentTime = 0;
    return rawScenes.map((scene: any, index: number) => {
      const wordCount = scene.text.split(/\s+/).length;
      const estimatedDuration = Math.max(3, Math.min(8, Math.ceil(wordCount / 3)));
      const startTime = currentTime;
      const endTime = startTime + estimatedDuration;
      currentTime = endTime;

      return {
        id: scene.sceneNumber || (index + 1),
        sceneNumber: scene.sceneNumber || (index + 1),
        text: scene.text,
        score: scene.score || 50,
        variants: scene.variants || [],
        start: startTime,
        end: endTime,
      };
    });
  }

  /**
   * Построение рекомендаций из результатов анализа
   */
  private buildRecommendations(
    scriptRecommendations: any[] | undefined,
    advancedRecommendations: any[] | undefined,
    scenes: any[]
  ): any[] {
    const recommendationsData: any[] = [];

    // Обработка рекомендаций из scriptAnalysis
    if (scriptRecommendations && Array.isArray(scriptRecommendations)) {
      for (const rec of scriptRecommendations) {
        const sceneNumber = rec.sceneNumber;
        if (sceneNumber && sceneNumber > 0 && sceneNumber <= scenes.length) {
          recommendationsData.push({
            sceneId: sceneNumber,
            priority: rec.priority || 'medium',
            area: rec.area || 'general',
            currentText: rec.current || '',
            suggestedText: rec.suggested || '',
            reasoning: rec.reasoning || 'Улучшение для повышения вирусности',
            expectedImpact: rec.expectedImpact || '+0 points',
            sourceAgent: rec.area || 'general',
            scoreDelta: extractScoreDelta(rec.expectedImpact),
            confidence: priorityToConfidence(rec.priority),
          });
        }
      }
    }

    // Обработка рекомендаций из advancedAnalysis
    if (advancedRecommendations && Array.isArray(advancedRecommendations)) {
      for (const rec of advancedRecommendations) {
        const sceneNumber = rec.sceneNumber ||
          (rec.area === 'hook' ? 1 :
           rec.area === 'cta' ? scenes.length :
           Math.floor(scenes.length / 2));

        if (sceneNumber > 0 && sceneNumber <= scenes.length) {
          const isDuplicate = recommendationsData.some(existing =>
            existing.sceneId === sceneNumber &&
            existing.area === rec.area &&
            existing.priority === rec.priority
          );

          if (!isDuplicate) {
            recommendationsData.push({
              sceneId: sceneNumber,
              priority: rec.priority || 'medium',
              area: rec.area || 'general',
              currentText: rec.current || scenes[sceneNumber - 1]?.text || '',
              suggestedText: rec.suggested || '',
              reasoning: rec.reasoning || 'Улучшение для повышения вирусности',
              expectedImpact: rec.expectedImpact || '+0 points',
              sourceAgent: rec.area || 'general',
              scoreDelta: extractScoreDelta(rec.expectedImpact),
              confidence: priorityToConfidence(rec.priority),
            });
          }
        }
      }
    }

    return recommendationsData;
  }

  /**
   * Расчет diff между версиями сцен
   */
  private calculateSceneDiff(oldScenes: any[], newScenes: any[]): Array<{sceneId: number; before: string; after: string}> {
    const diff: Array<{sceneId: number; before: string; after: string}> = [];
    
    for (let i = 0; i < Math.max(oldScenes.length, newScenes.length); i++) {
      const oldScene = oldScenes[i];
      const newScene = newScenes[i];
      
      if (!oldScene && newScene) {
        // New scene added
        diff.push({
          sceneId: newScene.id || newScene.sceneNumber || (i + 1),
          before: '',
          after: newScene.text,
        });
      } else if (oldScene && !newScene) {
        // Scene removed
        diff.push({
          sceneId: oldScene.id || oldScene.sceneNumber || (i + 1),
          before: oldScene.text,
          after: '',
        });
      } else if (oldScene && newScene && oldScene.text !== newScene.text) {
        // Scene modified
        diff.push({
          sceneId: newScene.id || newScene.sceneNumber || (i + 1),
          before: oldScene.text,
          after: newScene.text,
        });
      }
    }
    
    return diff;
  }

  /**
   * Создание новой версии скрипта
   */
  private async createScriptVersion(params: {
    projectId: string;
    scenes: any[];
    createdBy: 'user' | 'ai' | 'system';
    changes: any;
    parentVersionId?: string;
    analysisResult?: any;
    analysisScore?: number;
    userId?: string;
  }) {
    const {
      projectId,
      scenes,
      createdBy,
      changes,
      parentVersionId,
      analysisResult,
      analysisScore,
      userId,
    } = params;

    // Get next version number
    const versions = await projectsService.getScriptVersions(projectId);
    const nextVersion = versions.length > 0
      ? Math.max(...versions.map(v => v.versionNumber)) + 1
      : 1;

    // Build full script text
    const fullScript = scenes
      .map((s: any) => `[${s.start}-${s.end}s] ${s.text}`)
      .join('\n');

    // Get current version for diff calculation
    const currentVersion = await projectsService.getCurrentScriptVersion(projectId);

    // Calculate diff
    let finalDiff = null;
    if (currentVersion && currentVersion.scenes) {
      finalDiff = this.calculateSceneDiff(currentVersion.scenes as any[], scenes);
    }

    // Build provenance
    const finalProvenance = {
      source: changes?.type || 'unknown',
      userId: userId,
      ts: new Date().toISOString(),
    };

    // Create new version atomically
    const newVersion = await projectsService.createScriptVersionAtomic({
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
   * Генерация скрипта для проекта
   */
  async generateScript(projectId: string, userId: string, dto: GenerateScriptBodyDto) {
    const { formatId, targetLocale = 'ru' } = dto;

    if (!formatId) {
      throw new FormatIdRequiredError();
    }

    logger.info(`[Generate Script] Request received`, {
      projectId,
      formatId,
      targetLocale,
    });

    // Получить проект
    const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
    if (!project) {
      throw new ProjectNotFoundError();
    }

    // Получить steps проекта
    const steps = await projectsService.getProjectSteps(projectId);
    const step2 = steps.find(s => s.stepNumber === 2);
    const step2Data = step2?.data as any;

    // Извлечь контент
    const { title, content } = await extractProjectContent(project, step2Data);

    if (!content || content.trim().length === 0) {
      throw new NoContentFoundError();
    }

    // Получить API ключ
    const apiKey = await apiKeysService.getUserApiKey(userId, 'anthropic');
    if (!apiKey) {
      throw new ApiKeyNotConfiguredError('Anthropic');
    }

    const formatName = FORMAT_NAME_MAP[formatId] || formatId;

    logger.info(`[Generate Script] Starting script generation`, {
      projectId,
      formatId,
      formatName,
      contentLength: content.length,
    });

    // Анализ и генерация скрипта
    const scriptAnalysis = await analyzeScript(
      apiKey.decryptedKey,
      formatName,
      content.substring(0, 5000)
    );

    if (!scriptAnalysis.scenes || scriptAnalysis.scenes.length === 0) {
      throw new NoScenesGeneratedError();
    }

    const scenes = this.buildScenesWithTiming(scriptAnalysis.scenes);

    // Multi-Agent Analysis
    logger.info(`[Generate Script] Starting Multi-Agent Analysis`, { projectId });

    const scriptText = scenes.map(s => s.text).join('\n');
    const fullScriptContent = `${title || 'Untitled'}\n\n${scriptText}`;

    const [hookAnalysis, structureAnalysis, emotionalAnalysis, ctaAnalysis] = await Promise.all([
      analyzeHook(apiKey.decryptedKey, fullScriptContent),
      analyzeStructure(apiKey.decryptedKey, fullScriptContent, {
        scenes: scenes.map(s => ({ text: s.text, duration: s.end - s.start }))
      }),
      analyzeEmotionalImpact(apiKey.decryptedKey, fullScriptContent),
      analyzeCTA(apiKey.decryptedKey, fullScriptContent),
    ]);

    const advancedAnalysis = await synthesizeAnalysis(
      apiKey.decryptedKey,
      hookAnalysis,
      structureAnalysis,
      emotionalAnalysis,
      ctaAnalysis,
      'custom_script'
    );

    logger.info(`[Generate Script] Multi-Agent Analysis completed`, {
      projectId,
      overallScore: advancedAnalysis.overallScore,
    });

    // Построение рекомендаций
    const recommendationsData = this.buildRecommendations(
      scriptAnalysis.recommendations,
      advancedAnalysis.recommendations,
      scenes
    );

    const finalScore = Math.max(
      scriptAnalysis.overallScore || 50,
      advancedAnalysis.overallScore || 50
    );

    // Создание версии скрипта
    const newVersion = await this.createScriptVersion({
      projectId,
      scenes,
      createdBy: 'system',
      changes: {
        type: 'initial',
        description: `Initial version generated from ${formatName} format`,
      },
      analysisResult: {
        scriptAnalysis,
        advancedAnalysis,
        combinedScore: finalScore,
      },
      analysisScore: finalScore,
      userId,
    });

    // Создание рекомендаций
    if (recommendationsData.length > 0) {
      const recommendations = recommendationsData.map(rec => ({
        ...rec,
        scriptVersionId: newVersion.id,
      }));
      await projectsScriptRepo.createSceneRecommendations(recommendations);
    }

    logger.info(`[Generate Script] Script generated successfully`, {
      projectId,
      versionId: newVersion.id,
      scenesCount: scenes.length,
      recommendationsCount: recommendationsData.length,
      finalScore,
    });

    return {
      success: true,
      data: {
        version: newVersion,
        formatName,
        scenesCount: scenes.length,
        recommendationsCount: recommendationsData.length,
        analysis: {
          scriptScore: scriptAnalysis.overallScore,
          advancedScore: advancedAnalysis.overallScore,
          finalScore,
          verdict: advancedAnalysis.verdict,
          hookScore: advancedAnalysis.hookScore,
          structureScore: advancedAnalysis.structureScore,
          emotionalScore: advancedAnalysis.emotionalScore,
          ctaScore: advancedAnalysis.ctaScore,
          strengths: advancedAnalysis.strengths,
          weaknesses: advancedAnalysis.weaknesses,
        }
      }
    };
  }
}

export const projectsScriptService = new ProjectsScriptService();
