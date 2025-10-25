import type { IStorage } from '../storage';
import type { InsertProject, InsertProjectStep } from '@shared/schema';

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
  }

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
    // Get the news item
    const items = await this.storage.getRssItems(userId);
    const item = items.find(i => i.id === itemId);

    if (!item) {
      const error: any = new Error('News item not found or not authorized');
      error.statusCode = 404;
      throw error;
    }

    // Business rule: Check if already used in a project
    if (item.usedInProject) {
      const error: any = new Error('This news item is already used in another project');
      error.projectId = item.usedInProject;
      error.statusCode = 400;
      throw error;
    }

    // Generate concise project title from news title (max 60 chars)
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
      currentStage: 2,
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

    // Create project atomically (transaction ensures data consistency)
    const project = await this.storage.createProjectFromNewsAtomic(
      userId,
      projectData as any,
      stepData as any,
      itemId
    );

    return project;
  }

  /**
   * Create project (generic/custom)
   * 
   * Used for custom script sources or other project types
   */
  async createProject(userId: string, projectData: Omit<InsertProject, 'id' | 'userId'>) {
    const project = await this.storage.createProject(userId, projectData as any);
    return project;
  }
}
