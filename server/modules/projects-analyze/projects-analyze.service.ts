import { ProjectsService } from "../projects/projects.service";
import { apiKeysService } from "../api-keys/api-keys.service";
import { newsService } from "../news/news.service";
import { logger } from "../../lib/logger";
import { scoreNewsAdvanced } from "../../ai-services/advanced";
import {
  ProjectNotFoundError,
  NoContentFoundError,
  ApiKeyNotConfiguredError,
  AnalysisFailedError,
} from "./projects-analyze.errors";
import type { Project, ProjectStep } from "@shared/schema";

const projectsService = new ProjectsService();

/**
 * Projects Analyze Service
 * Вся бизнес-логика анализа источников проектов
 */
export class ProjectsAnalyzeService {
  /**
   * Извлечение контента из проекта в зависимости от типа источника
   */
  private async extractProjectContent(
    project: Project,
    step2Data: any
  ): Promise<{ title: string; content: string }> {
    let title = '';
    let content = '';

    if (project.sourceType === 'news' && project.sourceData) {
      const sourceData = project.sourceData as any;
      title = sourceData.title || step2Data?.title || '';
      content = sourceData.content || step2Data?.content || '';
    } else if (project.sourceType === 'instagram' && project.sourceData) {
      const sourceData = project.sourceData as any;
      title = sourceData.caption || step2Data?.caption || '';
      content = sourceData.transcription || step2Data?.transcription || '';
    } else if (project.sourceType === 'custom' && step2Data) {
      title = step2Data.title || '';
      content = step2Data.content || step2Data.text || step2Data.script || '';
    }

    return { title, content };
  }

  /**
   * Получение рекомендованного формата на основе результатов анализа
   */
  private getRecommendedFormat(analysisResult: any): {
    formatId: string;
    name: string;
    reason: string;
  } {
    if (analysisResult.breakdown?.recommendedFormat) {
      const formatMap: Record<string, { id: string; name: string }> = {
        'news_update': { id: 'news', name: 'News Update' },
        'explainer': { id: 'explainer', name: 'Explainer' },
        'story': { id: 'hook', name: 'Hook & Story' },
        'comparison': { id: 'comparison', name: 'Comparison' },
        'tutorial': { id: 'tutorial', name: 'Tutorial' },
        'trend': { id: 'trend', name: 'Trend' },
      };

      const formatId = analysisResult.breakdown.recommendedFormat.format || 'news_update';
      const formatInfo = formatMap[formatId] || formatMap['news_update'];

      return {
        formatId: formatInfo.id,
        name: formatInfo.name,
        reason: analysisResult.breakdown.recommendedFormat.reasoning || 'Рекомендовано на основе анализа статьи',
      };
    }

    const formatMap: Record<string, { id: string; name: string; reason: string }> = {
      'hook_story': { id: 'hook', name: 'Hook & Story', reason: 'Внимание-захватывающее начало с повествовательной аркой' },
      'problem_solution': { id: 'problem_solution', name: 'Problem & Solution', reason: 'Формат решения проблемы для высокооцененного контента' },
      'educational': { id: 'explainer', name: 'Explainer', reason: 'Образовательный формат для сложных тем' },
    };

    let recommendedFormatId = 'hook';
    if (analysisResult.overallScore >= 80) {
      recommendedFormatId = 'problem_solution';
    } else if (analysisResult.overallScore >= 60) {
      recommendedFormatId = 'hook';
    } else {
      recommendedFormatId = 'educational';
    }

    const formatInfo = formatMap[recommendedFormatId] || formatMap['hook_story'];
    return {
      formatId: formatInfo.id,
      name: formatInfo.name,
      reason: formatInfo.reason,
    };
  }

  /**
   * Анализ источника проекта
   */
  async analyzeSource(projectId: string, userId: string) {
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
    const { title, content } = await this.extractProjectContent(project, step2Data);

    if (!content || content.trim().length === 0) {
      throw new NoContentFoundError();
    }

    // Получить API ключ
    const apiKey = await apiKeysService.getUserApiKey(userId, 'anthropic');
    if (!apiKey) {
      throw new ApiKeyNotConfiguredError('Anthropic');
    }

    // Определить язык
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(content);
    const language = hasCyrillic ? 'ru' : 'en';

    logger.info(`[Analyze Source] Starting analysis for project ${projectId}`, {
      projectId,
      sourceType: project.sourceType,
      contentLength: content.length,
    });

    let analysisResult: any = null;

    // Проверить существующий анализ из News Hub
    if (project.sourceType === 'news' && project.sourceData) {
      const sourceData = project.sourceData as any;
      const newsItem = await newsService.getNewsItemById(sourceData.itemId);

      if (newsItem?.articleAnalysis) {
        logger.info(`[Analyze Source] Using existing articleAnalysis from news item ${sourceData.itemId}`);
        const articleAnalysis = typeof newsItem.articleAnalysis === 'string'
          ? JSON.parse(newsItem.articleAnalysis)
          : newsItem.articleAnalysis;

        analysisResult = {
          overallScore: articleAnalysis.score || 0,
          score: articleAnalysis.score || 0,
          strengths: articleAnalysis.strengths || [],
          weaknesses: articleAnalysis.weaknesses || [],
          topics: [],
          sentiment: articleAnalysis.breakdown?.emotionalAngle?.primaryEmotion || 'neutral',
          keywords: [],
          risks: articleAnalysis.weaknesses || [],
          verdict: articleAnalysis.verdict || 'moderate',
          breakdown: articleAnalysis.breakdown || {}
        };
      }
    }

    // Если нет существующего анализа, запустить новый
    if (!analysisResult) {
      if (project.sourceType === 'news') {
        logger.info(`[Analyze Source] Running analyzeArticlePotential() for project ${projectId}`);
        const { analyzeArticlePotential } = await import('../../ai-services/analyze-article-potential');
        const articleAnalysis = await analyzeArticlePotential(
          apiKey.decryptedKey,
          title || 'Untitled',
          content.substring(0, 5000)
        );

        analysisResult = {
          overallScore: articleAnalysis.score || 0,
          score: articleAnalysis.score || 0,
          strengths: articleAnalysis.strengths || [],
          weaknesses: articleAnalysis.weaknesses || [],
          topics: [],
          sentiment: articleAnalysis.breakdown?.emotionalAngle?.primaryEmotion || 'neutral',
          keywords: [],
          risks: articleAnalysis.weaknesses || [],
          verdict: articleAnalysis.verdict || 'moderate',
          breakdown: articleAnalysis.breakdown || {}
        };
      } else {
        logger.info(`[Analyze Source] Using scoreNewsAdvanced() for ${project.sourceType} source`);
        analysisResult = await scoreNewsAdvanced(
          apiKey.decryptedKey,
          title || 'Untitled',
          content.substring(0, 5000)
        );
      }
    }

    // Получить рекомендованный формат
    const recommendedFormat = this.getRecommendedFormat(analysisResult);

    // Сформировать анализ
    const analysis = {
      score: analysisResult.overallScore,
      verdict: analysisResult.verdict,
      strengths: analysisResult.strengths || [],
      weaknesses: analysisResult.weaknesses || [],
      topics: analysisResult.breakdown?.structure?.topics || [],
      sentiment: analysisResult.breakdown?.emotional?.sentiment || 'neutral',
      keywords: analysisResult.breakdown?.structure?.keywords || [],
      viralPotential: analysisResult.verdict === 'viral' ? 'High' :
                      analysisResult.verdict === 'strong' ? 'Medium-High' :
                      analysisResult.verdict === 'moderate' ? 'Medium' : 'Low',
    };

    // Подготовить ответ
    const response = {
      success: true,
      data: {
        analysis,
        recommendedFormat,
        sourceMetadata: {
          language,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          characterCount: content.length,
        },
        metadata: {
          analysisTime: Date.now(),
          sourceType: project.sourceType,
        }
      }
    };

    // Сохранить в step 3 data
    const existingStep3 = steps.find(s => s.stepNumber === 3);
    if (existingStep3) {
      await projectsService.updateProjectStep(existingStep3.id, {
        data: {
          ...(existingStep3.data as any || {}),
          sourceAnalysis: analysis,
          recommendedFormat,
          sourceMetadata: response.data.sourceMetadata,
          metadata: response.data.metadata,
        }
      });
    } else {
      await projectsService.createProjectStep({
        projectId,
        stepNumber: 3,
        data: {
          sourceAnalysis: analysis,
          recommendedFormat,
          sourceMetadata: response.data.sourceMetadata,
          metadata: response.data.metadata,
        }
      });
    }

    return response;
  }
}

export const projectsAnalyzeService = new ProjectsAnalyzeService();
