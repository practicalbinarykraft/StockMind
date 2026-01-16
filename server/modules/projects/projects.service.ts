import type { InsertProject, InsertProjectStep, Project, ProjectStep, ScriptVersion } from "@shared/schema";
import type { ArticlePotentialResult } from "@shared/article-potential-types";
import { ProjectsRepo } from "./projects.repo";
import { instagramItemsService } from "../instagram-items/instagram-items.service";
import { newsService } from "../news/news.service";
import { logger } from "../../lib/logger";
import {
  ProjectNotFoundError,
  ProjectForbiddenError,
  InvalidStageError,
  StageNavigationError,
  InstagramItemNotFoundError,
  InstagramItemAlreadyUsedError,
  InstagramTranscriptionRequiredError,
  NewsItemNotFoundError,
  NewsItemAlreadyUsedError,
} from "./projects.errors";
import type { UpdateProjectDto, UpdateProjectStageDto, BatchCreateProjectsDto } from "./projects.dto";

/**
 * Projects Service
 * Вся бизнес-логика, принятие решений, оркестрация шагов
 */
export class ProjectsService {
  private repo: ProjectsRepo;

  constructor() {
    this.repo = new ProjectsRepo();
  }

  // ============================================================================
  // GET ALL PROJECTS
  // ============================================================================

  /**
   * Получение всех проектов с обогащенными данными
   * Поддержка ?include=steps,currentVersion для batch loading
   */
  async getAllProjects(userId: string, includeParam?: string) {
    const projects = await this.repo.getAll(userId);

    const includes = includeParam?.split(",").map(s => s.trim()).filter(Boolean) || [];
    const includeSteps = includes.includes("steps");
    const includeCurrentVersion = includes.includes("currentVersion");

    // Batch fetch all steps (needed for stats computation)
    const allProjectSteps = await Promise.all(
      projects.map(p => this.repo.getProjectSteps(p.id))
    );
    const stepsMap = new Map(projects.map((p, i) => [p.id, allProjectSteps[i]]));

    // Batch fetch current versions if requested
    let versionsMap = new Map<string, ScriptVersion | null>();
    if (includeCurrentVersion) {
      const allVersions = await Promise.all(
        projects.map(p => this.repo.getScriptVersions(p.id))
      );
      versionsMap = new Map(projects.map((p, i) => {
        const versions = allVersions[i];
        const current = versions.find(v => v.isCurrent) || versions[0] || null;
        return [p.id, current];
      }));
    }

    const enrichedProjects = projects.map((project) => {
      const steps = stepsMap.get(project.id) || [];

      // Auto-generate title if missing
      let autoTitle = project.title;
      if (!autoTitle || autoTitle === "Untitled Project") {
        const step3 = steps.find(s => s.stepNumber === 3);
        const step3Data = step3?.data as any;
        if (step3Data?.scenes && step3Data.scenes.length > 0) {
          const firstSceneText = step3Data.scenes[0].text || "";
          autoTitle = firstSceneText.substring(0, 50) + (firstSceneText.length > 50 ? "..." : "");
        }
      }

      // Extract stats from steps
      const step3 = steps.find(s => s.stepNumber === 3);
      const step4 = steps.find(s => s.stepNumber === 4);
      const step5 = steps.find(s => s.stepNumber === 5);
      const step3Data = step3?.data as any;
      const step4Data = step4?.data as any;
      const step5Data = step5?.data as any;

      let formatValue = step3Data?.selectedFormat || step3Data?.format || "unknown";
      if (typeof formatValue === 'object' && formatValue !== null) {
        formatValue = formatValue.formatId || formatValue.format || "unknown";
      }
      formatValue = typeof formatValue === 'string' ? formatValue : "unknown";

      const stats = {
        scenesCount: step3Data?.scenes?.length || 0,
        duration: step5Data?.duration || step4Data?.duration || 0,
        format: formatValue,
        thumbnailUrl: step5Data?.thumbnailUrl || null,
      };

      const result: any = {
        ...project,
        displayTitle: autoTitle || project.title || "Untitled Project",
        stats,
      };

      if (includeSteps) {
        result.steps = steps;
      }

      if (includeCurrentVersion) {
        result.currentVersion = versionsMap.get(project.id) || null;
      }

      return result;
    });

    return enrichedProjects;
  }

  // ============================================================================
  // GET PROJECT BY ID
  // ============================================================================

  async getProjectById(id: string, userId: string): Promise<Project> {
    const project = await this.repo.getById(id);
    
    if (!project) {
      throw new ProjectNotFoundError();
    }
    
    if (project.userId !== userId) {
      throw new ProjectForbiddenError();
    }

    return project;
  }

  /**
   * Получить проект по ID и userId (для использования другими модулями)
   */
  async getProjectByIdAndUserId(id: string, userId: string): Promise<Project | undefined> {
    return await this.repo.getByIdAndUserId(id, userId);
  }

  /**
   * Получить steps проекта (для использования другими модулями)
   */
  async getProjectSteps(projectId: string): Promise<ProjectStep[]> {
    return await this.repo.getProjectSteps(projectId);
  }

  /**
   * Создать project step (для использования другими модулями)
   */
  async createProjectStep(data: InsertProjectStep): Promise<ProjectStep> {
    return await this.repo.createProjectStep(data);
  }

  /**
   * Обновить project step (для использования другими модулями)
   */
  async updateProjectStep(id: string, data: Partial<ProjectStep>): Promise<ProjectStep | undefined> {
    return await this.repo.updateProjectStep(id, data);
  }

  /**
   * Получить все версии скрипта (для использования другими модулями)
   */
  async getScriptVersions(projectId: string): Promise<ScriptVersion[]> {
    return await this.repo.getScriptVersions(projectId);
  }

  /**
   * Получить текущую версию скрипта (для использования другими модулями)
   */
  async getCurrentScriptVersion(projectId: string): Promise<ScriptVersion | undefined> {
    return await this.repo.getCurrentScriptVersion(projectId);
  }

  /**
   * Создать версию скрипта атомарно (для использования другими модулями)
   */
  async createScriptVersionAtomic(data: any): Promise<ScriptVersion> {
    return await this.repo.createScriptVersionAtomic(data);
  }

  // ============================================================================
  // CREATE PROJECT
  // ============================================================================

  async createProject(userId: string, data: Omit<InsertProject, 'userId'>): Promise<Project> {
    return await this.repo.create(userId, data);
  }

  // ============================================================================
  // CREATE FROM INSTAGRAM
  // ============================================================================

  async createProjectFromInstagram(userId: string, itemId: string): Promise<Project> {
    // Get the Instagram item
    const items = await instagramItemsService.getInstagramItems(userId, {});
    const item = items.find(i => i.id === itemId);

    if (!item) {
      throw new InstagramItemNotFoundError();
    }

    // Business rule: Check if already used in a project
    if (item.usedInProject) {
      throw new InstagramItemAlreadyUsedError(item.usedInProject);
    }

    // Business rule: Check if transcription is available
    if (!item.transcriptionText || item.transcriptionStatus !== 'completed') {
      throw new InstagramTranscriptionRequiredError(item.transcriptionStatus || undefined);
    }

    // Generate project title from caption or transcription (max 50 chars)
    const titleSource = item.caption || item.transcriptionText || 'Instagram Reel';
    const title = titleSource.length > 50 
      ? titleSource.substring(0, 47) + '...' 
      : titleSource;

    // Build project data
    const projectData: Omit<InsertProject, 'id' | 'userId'> = {
      title,
      sourceType: 'instagram',
      sourceData: {
        itemId: item.id,
        externalId: item.externalId,
        shortCode: item.shortCode,
        url: item.url,
        caption: item.caption,
        ownerUsername: item.ownerUsername,
        transcription: item.transcriptionText,
        language: item.language,
        aiScore: item.aiScore,
        aiComment: item.aiComment,
        freshnessScore: item.freshnessScore,
        viralityScore: item.viralityScore,
        qualityScore: item.qualityScore,
        engagement: {
          likes: item.likesCount,
          comments: item.commentsCount,
          views: item.videoViewCount,
        }
      },
      currentStage: 2,
      status: 'draft',
    };

    // Build step data for Stage 2
    const stepData: Omit<InsertProjectStep, 'id' | 'projectId'> = {
      stepNumber: 2,
      data: {
        id: item.id,
        externalId: item.externalId,
        shortCode: item.shortCode,
        url: item.url,
        caption: item.caption,
        ownerUsername: item.ownerUsername,
        transcription: item.transcriptionText,
        language: item.language,
        aiScore: item.aiScore,
        aiComment: item.aiComment,
        engagement: {
          likes: item.likesCount,
          comments: item.commentsCount,
          views: item.videoViewCount,
        }
      }
    };

    const project = await this.repo.createFromInstagramAtomic(
      userId,
      projectData as any,
      stepData as any,
      itemId
    );

    logger.info(`[Project] Created from Instagram Reel: ${project.id} (item: ${itemId})`);
    return project;
  }

  // ============================================================================
  // CREATE FROM NEWS
  // ============================================================================

  async createProjectFromNews(userId: string, itemId: string): Promise<Project> {
    logger.info(`[ProjectsService] Starting createProjectFromNews for item ${itemId}, user ${userId}`);
    
    // Get the news item
    const items = await newsService.getNews(userId);
    const item = items.find(i => i.id === itemId);
    
    logger.info(`[ProjectsService] News item lookup result:`, {
      itemId,
      found: !!item,
      hasArticleAnalysis: !!item?.articleAnalysis,
      usedInProject: item?.usedInProject,
    });

    if (!item) {
      logger.error(`[ProjectsService] News item ${itemId} not found or not authorized for user ${userId}`);
      throw new NewsItemNotFoundError();
    }

    // Business rule: Check if already used in a project
    if (item.usedInProject) {
      logger.info(`[ProjectsService] News item ${itemId} has usedInProject: ${item.usedInProject}`);
      
      // Check if the referenced project still exists
      const referencedProject = await this.repo.getById(item.usedInProject);
      
      logger.info(`[ProjectsService] Referenced project check:`, {
        projectId: item.usedInProject,
        exists: !!referencedProject,
        status: referencedProject?.status,
      });
      
      // If project doesn't exist OR is deleted, clear the reference
      if (!referencedProject || referencedProject.status === 'deleted') {
        logger.info(`[ProjectsService] Clearing reference to ${referencedProject ? 'deleted' : 'non-existent'} project`);
        await this.repo.updateRssItem(itemId, {
          usedInProject: null,
          userAction: null
        });
        item.usedInProject = null;
        item.userAction = null;
      } else {
        // Project exists and is NOT deleted
        logger.warn(`[ProjectsService] News item ${itemId} is already used in active project`);
        throw new NewsItemAlreadyUsedError(item.usedInProject);
      }
    }

    // Generate project title from news title (max 60 chars)
    const titleSource = item.title || 'News Article';
    const title = titleSource.length > 60 
      ? titleSource.substring(0, 57) + '...' 
      : titleSource;

    // Build project data
    const projectData: Omit<InsertProject, 'id' | 'userId'> = {
      title,
      sourceType: 'news',
      sourceData: {
        itemId: item.id,
        title: item.title,
        url: item.url,
        content: item.content,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        aiScore: item.aiScore,
        aiComment: item.aiComment,
      },
      currentStage: 3, // Stage 2 is skipped, go directly to Stage 3
      status: 'draft',
    };

    // Build step data for Stage 2
    const stepData: Omit<InsertProjectStep, 'id' | 'projectId'> = {
      stepNumber: 2,
      data: {
        title: item.title,
        content: item.content,
        url: item.url,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        aiScore: item.aiScore,
        aiComment: item.aiComment,
      }
    };

    // Build step data for Stage 3 if article analysis exists
    let step3Data: Omit<InsertProjectStep, 'id' | 'projectId'> | null = null;
    
    if (item.articleAnalysis) {
      let articleAnalysis: ArticlePotentialResult | null = item.articleAnalysis as ArticlePotentialResult;

      // Double-check parsing if it's still a string
      if (typeof item.articleAnalysis === 'string') {
        try {
          articleAnalysis = JSON.parse(item.articleAnalysis) as ArticlePotentialResult;
        } catch (e) {
          logger.warn(`[ProjectsService] Failed to parse articleAnalysis: ${e}`);
          articleAnalysis = null;
        }
      }

      if (articleAnalysis && articleAnalysis.score !== undefined) {
        logger.info(`[ProjectsService] Processing articleAnalysis`, {
          score: articleAnalysis.score,
          verdict: articleAnalysis.verdict,
        });
      
        // Convert ArticlePotentialResult to Stage 3 format
        const sourceAnalysis = {
          score: articleAnalysis.score || 0,
          verdict: articleAnalysis.verdict || 'moderate',
          strengths: articleAnalysis.strengths || [],
          weaknesses: articleAnalysis.weaknesses || [],
          topics: [],
          sentiment: articleAnalysis.breakdown?.emotionalAngle?.primaryEmotion || 'neutral',
          keywords: [],
          viralPotential: articleAnalysis.verdict === 'excellent' ? 'High' :
                         articleAnalysis.verdict === 'good' ? 'Medium-High' :
                         articleAnalysis.verdict === 'moderate' ? 'Medium' : 'Low',
        };

        // Convert recommendedFormat
        const formatMap: Record<string, { id: string; name: string }> = {
          'news_update': { id: 'news', name: 'News Update' },
          'explainer': { id: 'explainer', name: 'Explainer' },
          'story': { id: 'hook', name: 'Hook & Story' },
          'comparison': { id: 'comparison', name: 'Comparison' },
          'tutorial': { id: 'tutorial', name: 'Tutorial' },
          'trend': { id: 'trend', name: 'Trend' },
        };

        const recommendedFormatFromAnalysis = articleAnalysis.breakdown?.recommendedFormat;
        const formatId = recommendedFormatFromAnalysis?.format || 'news_update';
        const formatInfo = formatMap[formatId] || formatMap['news_update'];
        
        const recommendedFormat = {
          formatId: formatInfo.id,
          name: formatInfo.name,
          reason: recommendedFormatFromAnalysis?.reasoning || 'Рекомендовано на основе анализа статьи',
        };

        // Calculate source metadata
        const content = item.content || '';
        const hasCyrillic = /[а-яА-ЯёЁ]/.test(content);
        const language = hasCyrillic ? 'ru' : 'en';

        step3Data = {
          stepNumber: 3,
          data: {
            sourceAnalysis,
            recommendedFormat,
            sourceMetadata: {
              language,
              wordCount: content.split(/\s+/).filter(Boolean).length,
              characterCount: content.length,
            },
            metadata: {
              analysisTime: Date.now(),
              sourceType: 'news',
            },
          }
        };

        logger.info(`[ProjectsService] Created step3Data with recommendedFormat: ${recommendedFormat.formatId}`);
      }
    }

    const project = await this.repo.createFromNewsAtomic(
      userId,
      projectData as any,
      stepData as any,
      itemId,
      step3Data as any
    );
    
    logger.info(`[ProjectsService] Project created successfully: ${project.id}`);

    // Ensure correct currentStage
    if (project.currentStage !== projectData.currentStage) {
      logger.warn(`[ProjectsService] Project currentStage mismatch! Fixing...`);
      const fixedProject = await this.repo.update(project.id, userId, {
        currentStage: projectData.currentStage
      });
      return fixedProject || project;
    }

    return project;
  }

  // ============================================================================
  // UPDATE PROJECT
  // ============================================================================

  async updateProject(id: string, userId: string, data: UpdateProjectDto): Promise<Project> {
    const project = await this.repo.update(id, userId, data);
    
    if (!project) {
      throw new ProjectNotFoundError();
    }
    
    return project;
  }

  // ============================================================================
  // UPDATE PROJECT STAGE
  // ============================================================================

  async updateProjectStage(id: string, userId: string, dto: UpdateProjectStageDto): Promise<Project> {
    const { stage } = dto;

    // Validate stage range
    if (stage < 1 || stage > 8) {
      throw new InvalidStageError("Stage must be between 1 and 8");
    }

    const currentProject = await this.repo.getByIdAndUserId(id, userId);
    if (!currentProject) {
      throw new ProjectNotFoundError();
    }

    const steps = await this.repo.getProjectSteps(id);

    // Check if step is completed
    const isStepCompleted = (stepNumber: number) => {
      const step = steps.find(s => s.stepNumber === stepNumber);
      return !!(step?.completedAt || step?.data || step?.skipReason);
    };

    // Calculate max reached stage
    const maxReachedStage = steps.length > 0
      ? Math.max(
          currentProject.currentStage,
          ...steps
            .filter(s => s.completedAt || s.data || s.skipReason)
            .map(s => s.stepNumber)
        )
      : currentProject.currentStage;

    // Check navigation permission
    const canNavigate =
      stage === currentProject.currentStage ||
      isStepCompleted(stage) ||
      stage <= maxReachedStage;

    if (!canNavigate) {
      throw new StageNavigationError("Cannot navigate to a locked stage. Complete previous stages first.");
    }

    // Log navigation
    if (stage < currentProject.currentStage) {
      logger.info(`[Stage Navigation] User ${userId} navigated back to stage ${stage} from ${currentProject.currentStage}`, {
        projectId: id,
        fromStage: currentProject.currentStage,
        toStage: stage,
        maxReachedStage,
      });
    }

    const project = await this.repo.update(id, userId, { currentStage: stage });
    if (!project) {
      throw new ProjectNotFoundError();
    }

    return project;
  }

  // ============================================================================
  // DELETE PROJECT
  // ============================================================================

  async deleteProject(id: string, userId: string): Promise<void> {
    await this.repo.softDelete(id, userId);
    await this.repo.clearRssItemsUsedInProject(id);
    await this.repo.clearInstagramItemsUsedInProject(id);
  }

  async permanentlyDeleteProject(id: string, userId: string): Promise<void> {
    await this.repo.clearRssItemsUsedInProject(id);
    await this.repo.clearInstagramItemsUsedInProject(id);
    await this.repo.permanentDelete(id, userId);
  }

  // ============================================================================
  // CREATE FROM SCRIPT LIBRARY
  // ============================================================================

  /**
   * Create project from Script Library
   * 
   * Business rules:
   * - Script must exist and belong to user
   * - Script cannot be already used in active project
   * - Creates project starting at specified stage (default: Stage 4 - Voice Generation)
   */
  async createProjectFromScript(
    userId: string,
    script: any,
    skipToStage: number = 4
  ): Promise<Project> {
    logger.info(`[ProjectsService] Starting createProjectFromScript for script ${script.id}, user ${userId}, skipToStage: ${skipToStage}`);

    // Business rule: Check if already used in a project
    if (script.projectId) {
      const referencedProject = await this.repo.getById(script.projectId);
      if (referencedProject && referencedProject.status !== 'deleted') {
        throw new Error('This script is already used in another project');
      }
    }

    // Build project data
    const projectData: Omit<InsertProject, 'id' | 'userId'> = {
      title: script.title,
      sourceType: script.sourceType || 'custom',
      sourceData: {
        scriptId: script.id,
        sourceId: script.sourceId,
        sourceTitle: script.sourceTitle,
        sourceUrl: script.sourceUrl,
      },
      currentStage: skipToStage,
      status: 'draft',
    };

    // Build step data for Stage 2 (if source exists)
    let step2Data: Omit<InsertProjectStep, 'id' | 'projectId'> | null = null;
    if (script.sourceId && script.sourceType === 'rss') {
      const items = await newsService.getNews(userId);
      const item = items.find(i => i.id === script.sourceId);
      if (item) {
        step2Data = {
          stepNumber: 2,
          data: {
            title: item.title,
            content: item.content,
            url: item.url,
            imageUrl: item.imageUrl,
            publishedAt: item.publishedAt,
            aiScore: item.aiScore,
            aiComment: item.aiComment,
          }
        };
      }
    }

    // Build step data for Stage 3 (script with scenes)
    interface ScriptAiAnalysis {
      verdict?: string;
      strengths?: string[];
      weaknesses?: string[];
    }
    const aiAnalysis = script.aiAnalysis as ScriptAiAnalysis | null;

    const step3Data: Omit<InsertProjectStep, 'id' | 'projectId'> = {
      stepNumber: 3,
      data: {
        scenes: script.scenes,
        format: script.format,
        sourceAnalysis: aiAnalysis ? {
          score: script.aiScore || 0,
          verdict: aiAnalysis.verdict || 'moderate',
          strengths: aiAnalysis.strengths || [],
          weaknesses: aiAnalysis.weaknesses || [],
        } : undefined,
        recommendedFormat: script.format ? {
          formatId: script.format,
          name: script.format,
        } : undefined,
      }
    };

    // Create project
    const project = await this.repo.create(userId, projectData);

    // Create project steps
    if (step2Data) {
      await this.repo.createProjectStep({
        ...step2Data,
        projectId: project.id,
      } as any);
    }

    await this.repo.createProjectStep({
      ...step3Data,
      projectId: project.id,
    } as any);

    logger.info(`[ProjectsService] Project created from script:`, {
      projectId: project.id,
      currentStage: project.currentStage,
      scriptId: script.id,
    });

    return project;
  }

  // ============================================================================
  // BATCH CREATE
  // ============================================================================

  async batchCreateProjects(userId: string, dto: BatchCreateProjectsDto) {
    const { articleIds } = dto;
    const createdProjects = [];
    const errors = [];

    for (const articleId of articleIds) {
      try {
        const project = await this.createProjectFromNews(userId, articleId);
        createdProjects.push(project);
        logger.info(`[Batch Create] Created project ${project.id} from article ${articleId}`);
      } catch (error: any) {
        logger.error(`[Batch Create] Failed to create project from article ${articleId}:`, { error });
        errors.push({
          articleId,
          error: error.message || "Failed to create project"
        });
      }
    }

    return {
      success: true,
      created: createdProjects.length,
      total: articleIds.length,
      projects: createdProjects,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
