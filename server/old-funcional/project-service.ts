import type { IStorage } from '../storage';
import type { InsertProject, InsertProjectStep, ScriptLibrary } from '@shared/schema';
import type { ArticlePotentialResult } from '@shared/article-potential-types';
import { logger } from '../lib/logger';

/**
 * ProjectService - Business logic layer for project creation and management
 * 
 * Responsibilities:
 * - Validate input data
 * - Enforce business rules (e.g., uniqueness constraints)
 * - Orchestrate multi-step operations
 * - Generate derived data (e.g., titles)
 * - Call storage layer for persistence
 * 
 * Does NOT handle:
 * - HTTP request/response (that's routes.ts)
 * - Direct database access (that's storage.ts)
 * - Authentication (that's middleware)
 */

export class ProjectService {
  constructor(private storage: IStorage) {}

  /**
   * Create project from Instagram Reel
   * 
   * Business rules:
   * - Item must exist and belong to user
   * - Item cannot be already used in another project
   * - Transcription must be completed
   * 
   * @throws Error if validation fails
   */
  async createProjectFromInstagram(userId: string, itemId: string) {
    // Get the Instagram item
    const items = await this.storage.getInstagramItems(userId);
    const item = items.find(i => i.id === itemId);

    if (!item) {
      const error: any = new Error('Instagram Reel not found or not authorized');
      error.statusCode = 404;
      throw error;
    }

    // Business rule: Check if already used in a project
    if (item.usedInProject) {
      const error: any = new Error('This Reel is already used in another project');
      error.projectId = item.usedInProject;
      error.statusCode = 400;
      throw error;
    }

    // Business rule: Check if transcription is available
    if (!item.transcriptionText || item.transcriptionStatus !== 'completed') {
      throw new Error(
        `Reel must be transcribed before creating a project. Current status: ${item.transcriptionStatus || 'pending'}`
      );
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

    // Create project atomically (transaction ensures data consistency)
    const project = await this.storage.createProjectFromInstagramAtomic(
      userId,
      projectData as any,
      stepData as any,
      itemId
    );

    return project;
  }// done

  /**
   * Create project from News/RSS item
   * 
   * Business rules:
   * - Item must exist and belong to user
   * - Item cannot be already used in another project
   * 
   * @throws Error if validation fails
   */
  async createProjectFromNews(userId: string, itemId: string) {
    logger.info(`[ProjectService] Starting createProjectFromNews for item ${itemId}, user ${userId}`);
    
    // Get the news item - need to explicitly fetch with articleAnalysis
    const items = await this.storage.getRssItems(userId);
    const item = items.find(i => i.id === itemId);
    
    logger.info(`[ProjectService] News item lookup result:`, {
      itemId,
      found: !!item,
      hasArticleAnalysis: !!item?.articleAnalysis,
      usedInProject: item?.usedInProject,
      userAction: item?.userAction,
      articleAnalysisType: typeof item?.articleAnalysis,
      articleAnalysisKeys: item?.articleAnalysis ? Object.keys(item.articleAnalysis) : []
    });

    if (!item) {
      logger.error(`[ProjectService] News item ${itemId} not found or not authorized for user ${userId}`);
      const error: any = new Error('News item not found or not authorized');
      error.statusCode = 404;
      throw error;
    }

    // Business rule: Check if already used in a project
    if (item.usedInProject) {
      logger.info(`[ProjectService] News item ${itemId} has usedInProject: ${item.usedInProject}, checking if project exists...`);
      
      // Check if the referenced project still exists
      const referencedProject = await this.storage.getProjectById(item.usedInProject);
      
      logger.info(`[ProjectService] Referenced project check result:`, {
        projectId: item.usedInProject,
        exists: !!referencedProject,
        status: referencedProject?.status,
        isDeleted: referencedProject?.status === 'deleted'
      });
      
      // If project doesn't exist OR is deleted, clear the reference and allow reuse
      if (!referencedProject || referencedProject.status === 'deleted') {
        logger.info(`[ProjectService] News item ${itemId} references ${referencedProject ? 'deleted' : 'non-existent'} project ${item.usedInProject}, clearing reference`);
        try {
          await this.storage.updateRssItem(itemId, {
            usedInProject: null,
            userAction: null
          });
          logger.info(`[ProjectService] Successfully cleared usedInProject for item ${itemId}`);
          // Update local item reference to prevent re-check
          item.usedInProject = null;
          item.userAction = null;
        } catch (updateError: any) {
          logger.error(`[ProjectService] Failed to clear usedInProject for item ${itemId}:`, updateError);
          // Continue anyway - we'll try to create the project
        }
      } else {
        // Project exists and is NOT deleted - cannot reuse this article
        logger.warn(`[ProjectService] News item ${itemId} is already used in active project ${item.usedInProject}`);
        const error: any = new Error('This news item is already used in another project');
        error.projectId = item.usedInProject;
        error.statusCode = 400;
        throw error;
      }
    } else {
      logger.info(`[ProjectService] News item ${itemId} has no usedInProject, proceeding with project creation`);
    }

    // Generate concise project title from news title (max 60 chars)
    const titleSource = item.title || 'News Article';
    const title = titleSource.length > 60 
      ? titleSource.substring(0, 57) + '...' 
      : titleSource;

    // Build project data
    // currentStage: 3 because article is already selected (Stage 2 is skipped)
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
      currentStage: 3, // Stage 2 (article selection) is skipped, go directly to Stage 3 (script creation)
      status: 'draft',
    };
    
    logger.info(`[ProjectService] Creating project from news with currentStage: ${projectData.currentStage}`, {
      itemId: item.id,
      title: projectData.title
    });

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
    // This allows Stage 3 to skip analysis and use cached results
    let step3Data: Omit<InsertProjectStep, 'id' | 'projectId'> | null = null;
    
    if (item.articleAnalysis) {
      // articleAnalysis is already parsed by rss.storage.ts parseJsonbField()
      let articleAnalysis: ArticlePotentialResult | null = item.articleAnalysis as ArticlePotentialResult;

      // Double-check parsing if it's still a string
      if (typeof item.articleAnalysis === 'string') {
        try {
          articleAnalysis = JSON.parse(item.articleAnalysis) as ArticlePotentialResult;
        } catch (e) {
          logger.warn(`[ProjectService] Failed to parse articleAnalysis as JSON: ${e}`);
          articleAnalysis = null;
        }
      }

      if (articleAnalysis && articleAnalysis.score !== undefined) {
        logger.info(`[ProjectService] Processing articleAnalysis`, {
          score: articleAnalysis.score,
          verdict: articleAnalysis.verdict,
          hasBreakdown: !!articleAnalysis.breakdown,
          hasRecommendedFormat: !!articleAnalysis.breakdown?.recommendedFormat
        });
      
      // Convert ArticlePotentialResult to Stage 3 format
      const sourceAnalysis = {
        score: articleAnalysis.score || 0,
        verdict: articleAnalysis.verdict || 'moderate',
        strengths: articleAnalysis.strengths || [],
        weaknesses: articleAnalysis.weaknesses || [],
        topics: [], // Not available in ArticlePotentialResult
        sentiment: articleAnalysis.breakdown?.emotionalAngle?.primaryEmotion || 'neutral',
        keywords: [], // Not available in ArticlePotentialResult
        viralPotential: articleAnalysis.verdict === 'excellent' ? 'High' :
                       articleAnalysis.verdict === 'good' ? 'Medium-High' :
                       articleAnalysis.verdict === 'moderate' ? 'Medium' : 'Low',
      };

      // Convert recommendedFormat from ArticlePotentialResult format to Stage 3 format
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
        reason: recommendedFormatFromAnalysis?.reasoning || articleAnalysis.breakdown?.recommendedFormat?.reasoning || 'Рекомендовано на основе анализа статьи',
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

        logger.info(`[ProjectService] Found articleAnalysis, creating step3Data with recommendedFormat: ${recommendedFormat.formatId}`, {
          itemId: item.id,
          score: articleAnalysis.score,
          verdict: articleAnalysis.verdict
        });
      } else {
        logger.warn(`[ProjectService] articleAnalysis exists but is invalid for item ${itemId}`);
      }
    } else {
      logger.info(`[ProjectService] No articleAnalysis found for item ${itemId}, Stage 3 will require manual analysis`);
    }

    // Create project atomically (transaction ensures data consistency)
    const step3DataObj = step3Data?.data as Record<string, unknown> | undefined;
    logger.info(`[ProjectService] Creating project with step3Data:`, {
      hasStep3Data: !!step3Data,
      step3DataStepNumber: step3Data?.stepNumber,
      step3DataHasSourceAnalysis: !!step3DataObj?.sourceAnalysis,
      step3DataHasRecommendedFormat: !!step3DataObj?.recommendedFormat
    });
    
    const project = await this.storage.createProjectFromNewsAtomic(
      userId,
      projectData as any,
      stepData as any,
      itemId,
      step3Data as any
    );
    
    logger.info(`[ProjectService] Project created successfully:`, {
      projectId: project.id,
      currentStage: project.currentStage,
      expectedCurrentStage: projectData.currentStage,
      match: project.currentStage === projectData.currentStage
    });

    // CRITICAL: Ensure returned project has correct currentStage
    // Sometimes database defaults can override our value
    if (project.currentStage !== projectData.currentStage) {
      logger.warn(`[ProjectService] ⚠️ Project currentStage mismatch! Expected ${projectData.currentStage}, got ${project.currentStage}. Fixing...`);
      // Update the project to have correct currentStage
      const fixedProject = await this.storage.updateProject(project.id, userId, {
        currentStage: projectData.currentStage
      });
      logger.info(`[ProjectService] Fixed project currentStage to ${fixedProject?.currentStage}`);
      return fixedProject || project;
    }

    logger.info(`[ProjectService] Project created from news:`, {
      projectId: project.id,
      currentStage: project.currentStage,
      title: project.title
    });

    return project;
  }// done

  /**
   * Create project from Script Library
   * 
   * Business rules:
   * - Script must exist and belong to user
   * - Script cannot be already used in another project
   * - Creates project starting at specified stage (default: Stage 4 - Voice Generation)
   * 
   * @throws Error if validation fails
   */
  async createProjectFromScript(userId: string, script: ScriptLibrary, skipToStage: number = 4) {
    logger.info(`[ProjectService] Starting createProjectFromScript for script ${script.id}, user ${userId}, skipToStage: ${skipToStage}`);

    // Business rule: Check if already used in a project
    if (script.projectId) {
      const referencedProject = await this.storage.getProjectById(script.projectId);
      if (referencedProject && referencedProject.status !== 'deleted') {
        const error: any = new Error('This script is already used in another project');
        error.projectId = script.projectId;
        error.statusCode = 400;
        throw error;
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
      const items = await this.storage.getRssItems(userId);
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
    // Type for script AI analysis (from analyzeScriptAdvanced)
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
    const project = await this.storage.createProject(userId, projectData as any);

    // Create project steps
    if (step2Data) {
      await this.storage.createProjectStep({
        ...step2Data,
        projectId: project.id,
      } as any);
    }

    await this.storage.createProjectStep({
      ...step3Data,
      projectId: project.id,
    } as any);

    // Link script to project
    await this.storage.updateScriptProject(script.id, project.id);

    logger.info(`[ProjectService] Project created from script:`, {
      projectId: project.id,
      currentStage: project.currentStage,
      scriptId: script.id,
    });

    return project;
  } // to do

  /**
   * Create project (generic/custom)
   * 
   * Used for custom script sources or other project types
   */
  async createProject(userId: string, projectData: Omit<InsertProject, 'id' | 'userId'>) {
    const project = await this.storage.createProject(userId, projectData as any);
    return project;
  }// done
}
