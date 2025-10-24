// Reference: javascript_log_in_with_replit + javascript_database blueprints
import {
  users,
  apiKeys,
  rssSources,
  rssItems,
  instagramSources,
  instagramItems,
  projects,
  projectSteps,
  type User,
  type UpsertUser,
  type ApiKey,
  type InsertApiKey,
  type RssSource,
  type InsertRssSource,
  type RssItem,
  type InsertRssItem,
  type InstagramSource,
  type InsertInstagramSource,
  type InstagramItem,
  type InsertInstagramItem,
  type Project,
  type InsertProject,
  type ProjectStep,
  type InsertProjectStep,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encryption for API keys
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set for API key encryption");
}
const ENCRYPTION_KEY = process.env.SESSION_SECRET.slice(0, 32).padEnd(32, '0');
const ALGORITHM = 'aes-256-cbc';

function encryptApiKey(key: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptApiKey(encryptedKey: string): string {
  const parts = encryptedKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // API Keys
  getApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(userId: string, data: Omit<InsertApiKey, 'userId' | 'encryptedKey'> & { key: string }): Promise<ApiKey>;
  deleteApiKey(id: string, userId: string): Promise<void>;
  getUserApiKey(userId: string, provider: string): Promise<ApiKey | undefined>;
  getApiKeyById(id: string, userId: string): Promise<ApiKey | undefined>;

  // RSS Sources
  getRssSources(userId: string): Promise<RssSource[]>;
  createRssSource(userId: string, data: Omit<InsertRssSource, 'userId'>): Promise<RssSource>;
  updateRssSource(id: string, userId: string, data: Partial<RssSource>): Promise<RssSource | undefined>;
  deleteRssSource(id: string, userId: string): Promise<void>;

  // Instagram Sources
  getInstagramSources(userId: string): Promise<InstagramSource[]>;
  createInstagramSource(userId: string, data: Omit<InsertInstagramSource, 'userId'>): Promise<InstagramSource>;
  updateInstagramSource(id: string, userId: string, data: Partial<InstagramSource>): Promise<InstagramSource | undefined>;
  deleteInstagramSource(id: string, userId: string): Promise<void>;

  // RSS Items
  getRssItems(userId?: string): Promise<Array<RssItem & { sourceName: string }>>;
  getRssItemsBySource(sourceId: string): Promise<RssItem[]>;
  createRssItem(data: InsertRssItem): Promise<RssItem>;
  updateRssItem(id: string, data: Partial<RssItem>): Promise<RssItem | undefined>;
  updateRssItemAction(id: string, userId: string, action: string, projectId?: string): Promise<RssItem | undefined>;

  // Instagram Items
  getInstagramItems(userId: string, sourceId?: string): Promise<InstagramItem[]>;
  getInstagramItemsBySource(sourceId: string): Promise<InstagramItem[]>;
  createInstagramItem(data: InsertInstagramItem): Promise<InstagramItem>;
  updateInstagramItem(id: string, data: Partial<InstagramItem>): Promise<InstagramItem | undefined>;
  updateInstagramItemAction(id: string, userId: string, action: string, projectId?: string): Promise<InstagramItem | undefined>;
  updateInstagramItemDownloadStatus(
    id: string,
    status: 'pending' | 'downloading' | 'completed' | 'failed',
    localVideoPath?: string,
    localThumbnailPath?: string,
    downloadError?: string
  ): Promise<InstagramItem | undefined>;
  updateInstagramItemTranscription(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    transcriptionText?: string,
    language?: string,
    transcriptionError?: string
  ): Promise<InstagramItem | undefined>;
  updateInstagramItemAiScore(
    id: string,
    aiScore: number,
    aiComment: string,
    freshnessScore?: number,
    viralityScore?: number,
    qualityScore?: number
  ): Promise<InstagramItem | undefined>;

  // Projects
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string, userId: string): Promise<Project | undefined>;
  getProjectById(id: string): Promise<Project | undefined>; // Without userId check - for ownership validation
  createProject(userId: string, data: Omit<InsertProject, 'userId'>): Promise<Project>;
  updateProject(id: string, userId: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string, userId: string): Promise<void>;
  permanentlyDeleteProject(id: string, userId: string): Promise<void>;

  // Project Steps
  getProjectSteps(projectId: string): Promise<ProjectStep[]>;
  createProjectStep(data: InsertProjectStep): Promise<ProjectStep>;
  updateProjectStep(id: string, data: Partial<ProjectStep>): Promise<ProjectStep | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // API Keys
  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async createApiKey(
    userId: string,
    data: Omit<InsertApiKey, 'userId' | 'encryptedKey'> & { key: string }
  ): Promise<ApiKey> {
    const { key, ...rest } = data;
    const trimmedKey = key.trim(); // Remove whitespace
    
    // Extract last 4 characters for display (before encryption)
    const last4 = trimmedKey.length >= 4 ? trimmedKey.slice(-4) : trimmedKey;
    
    console.log(`[Storage] Creating API key for userId: ${userId}, provider: ${rest.provider}, isActive: ${rest.isActive ?? true}, last4: ...${last4}`);
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        ...rest,
        userId,
        encryptedKey: encryptApiKey(trimmedKey),
        last4,
      })
      .returning();
    
    console.log(`[Storage] Created API key: id=${apiKey.id}, provider=${apiKey.provider}, isActive=${apiKey.isActive}`);
    return apiKey;
  }

  async deleteApiKey(id: string, userId: string): Promise<void> {
    console.log(`[Storage] Deleting API key: id=${id}, userId=${userId}`);
    
    const result = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .returning();
    
    if (result.length > 0) {
      console.log(`[Storage] Successfully deleted API key: id=${result[0].id}, provider=${result[0].provider}`);
    } else {
      console.log(`[Storage] WARNING: No API key deleted for id=${id}, userId=${userId} - key not found or userId mismatch`);
    }
  }

  async getUserApiKey(userId: string, provider: string): Promise<ApiKey | undefined> {
    console.log(`[Storage] Getting API key for userId: ${userId}, provider: ${provider}`);
    
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider), eq(apiKeys.isActive, true)))
      .orderBy(desc(apiKeys.updatedAt))
      .limit(1);
    
    if (key) {
      console.log(`[Storage] Found API key: id=${key.id}, isActive=${key.isActive}, provider=${key.provider} (key length: ${key.encryptedKey.length} chars encrypted)`);
      // Decrypt the key before returning (DO NOT LOG DECRYPTED VALUE)
      return {
        ...key,
        encryptedKey: decryptApiKey(key.encryptedKey),
      };
    }
    
    console.log(`[Storage] No API key found for userId: ${userId}, provider: ${provider}`);
    return undefined;
  }

  async getApiKeyById(id: string, userId: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .limit(1);
    
    if (key) {
      // Decrypt the key before returning
      return {
        ...key,
        encryptedKey: decryptApiKey(key.encryptedKey),
      };
    }
    
    return undefined;
  }

  // RSS Sources
  async getRssSources(userId: string): Promise<RssSource[]> {
    return await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.userId, userId))
      .orderBy(desc(rssSources.createdAt));
  }

  async createRssSource(userId: string, data: Omit<InsertRssSource, 'userId'>): Promise<RssSource> {
    const [source] = await db
      .insert(rssSources)
      .values({ ...data, userId })
      .returning();
    return source;
  }

  async updateRssSource(
    id: string,
    userId: string,
    data: Partial<RssSource>
  ): Promise<RssSource | undefined> {
    const [source] = await db
      .update(rssSources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(rssSources.id, id), eq(rssSources.userId, userId)))
      .returning();
    return source;
  }

  async deleteRssSource(id: string, userId: string): Promise<void> {
    await db
      .delete(rssSources)
      .where(and(eq(rssSources.id, id), eq(rssSources.userId, userId)));
  }

  // Instagram Sources
  async getInstagramSources(userId: string): Promise<InstagramSource[]> {
    return await db
      .select()
      .from(instagramSources)
      .where(eq(instagramSources.userId, userId))
      .orderBy(desc(instagramSources.createdAt));
  }

  async createInstagramSource(userId: string, data: Omit<InsertInstagramSource, 'userId'>): Promise<InstagramSource> {
    const [source] = await db
      .insert(instagramSources)
      .values({ ...data, userId })
      .returning();
    return source;
  }

  async updateInstagramSource(
    id: string,
    userId: string,
    data: Partial<InstagramSource>
  ): Promise<InstagramSource | undefined> {
    const [source] = await db
      .update(instagramSources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(instagramSources.id, id), eq(instagramSources.userId, userId)))
      .returning();
    return source;
  }

  async deleteInstagramSource(id: string, userId: string): Promise<void> {
    await db
      .delete(instagramSources)
      .where(and(eq(instagramSources.id, id), eq(instagramSources.userId, userId)));
  }

  // RSS Items with source information
  async getRssItems(userId?: string): Promise<Array<RssItem & { sourceName: string }>> {
    if (userId) {
      // Get items from sources owned by this user
      const userSources = await this.getRssSources(userId);
      const sourceIds = userSources.map(s => s.id);
      
      if (sourceIds.length === 0) return [];
      
      // Create a map of sourceId -> sourceName for quick lookup
      const sourceNameMap = new Map(userSources.map(s => [s.id, s.name]));
      
      // Get all items from all user sources
      const allItems: Array<RssItem & { sourceName: string }> = [];
      for (const sourceId of sourceIds) {
        const sourceItems = await db
          .select()
          .from(rssItems)
          .where(eq(rssItems.sourceId, sourceId));
        
        // Add source name to each item
        const enrichedItems = sourceItems.map(item => ({
          ...item,
          sourceName: sourceNameMap.get(sourceId) || 'Unknown Source'
        }));
        allItems.push(...enrichedItems);
      }
      
      // Sort by AI score descending (nulls last), then by publishedAt descending
      return allItems.sort((a, b) => {
        // Items without score go to the end
        if (a.aiScore === null && b.aiScore === null) {
          // Both null - sort by date
          const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return bDate - aDate;
        }
        if (a.aiScore === null) return 1;
        if (b.aiScore === null) return -1;
        
        // Primary sort: by AI score (higher first)
        if (b.aiScore !== a.aiScore) {
          return b.aiScore - a.aiScore;
        }
        
        // Secondary sort: by published date (newer first)
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate;
      });
    }
    
    return await db
      .select()
      .from(rssItems)
      .orderBy(desc(rssItems.aiScore))
      .then(items => items.map(item => ({ ...item, sourceName: 'Unknown Source' })));
  }

  async createRssItem(data: InsertRssItem): Promise<RssItem> {
    const [item] = await db
      .insert(rssItems)
      .values(data)
      .returning();
    return item;
  }

  async updateRssItem(id: string, data: Partial<RssItem>): Promise<RssItem | undefined> {
    const [item] = await db
      .update(rssItems)
      .set(data)
      .where(eq(rssItems.id, id))
      .returning();
    return item;
  }

  async getRssItemsBySource(sourceId: string): Promise<RssItem[]> {
    return await db
      .select()
      .from(rssItems)
      .where(eq(rssItems.sourceId, sourceId))
      .orderBy(desc(rssItems.publishedAt));
  }

  async updateRssItemAction(
    id: string,
    userId: string,
    action: string,
    projectId?: string
  ): Promise<RssItem | undefined> {
    // First verify the item belongs to user's sources
    const [item] = await db
      .select()
      .from(rssItems)
      .where(eq(rssItems.id, id));
    
    if (!item) return undefined;
    
    // Check if source belongs to user
    const userSources = await this.getRssSources(userId);
    const sourceIds = userSources.map(s => s.id);
    
    if (!sourceIds.includes(item.sourceId)) {
      // Item doesn't belong to user's sources
      return undefined;
    }
    
    // Now safe to update
    const [updated] = await db
      .update(rssItems)
      .set({
        userAction: action,
        actionAt: new Date(),
        usedInProject: projectId || null,
        userId, // Set userId if not already set
      })
      .where(eq(rssItems.id, id))
      .returning();
    return updated;
  }

  // Instagram Items
  async getInstagramItems(userId: string, sourceId?: string): Promise<InstagramItem[]> {
    if (sourceId) {
      // Get items from specific source
      return await db
        .select()
        .from(instagramItems)
        .where(and(eq(instagramItems.userId, userId), eq(instagramItems.sourceId, sourceId)))
        .orderBy(desc(instagramItems.publishedAt));
    }
    
    // Get all items for user, sorted by AI score and published date
    const items = await db
      .select()
      .from(instagramItems)
      .where(eq(instagramItems.userId, userId));
    
    // Sort by AI score descending (nulls last), then by publishedAt descending
    return items.sort((a, b) => {
      // Items without score go to the end
      if (a.aiScore === null && b.aiScore === null) {
        // Both null - sort by date
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate;
      }
      if (a.aiScore === null) return 1;
      if (b.aiScore === null) return -1;
      
      // Primary sort: by AI score (higher first)
      if (b.aiScore !== a.aiScore) {
        return b.aiScore - a.aiScore;
      }
      
      // Secondary sort: by published date (newer first)
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    });
  }

  async getInstagramItemsBySource(sourceId: string): Promise<InstagramItem[]> {
    return await db
      .select()
      .from(instagramItems)
      .where(eq(instagramItems.sourceId, sourceId))
      .orderBy(desc(instagramItems.publishedAt));
  }

  async createInstagramItem(data: InsertInstagramItem): Promise<InstagramItem> {
    const [item] = await db
      .insert(instagramItems)
      .values(data)
      .returning();
    return item;
  }

  async updateInstagramItem(id: string, data: Partial<InstagramItem>): Promise<InstagramItem | undefined> {
    const [item] = await db
      .update(instagramItems)
      .set(data)
      .where(eq(instagramItems.id, id))
      .returning();
    return item;
  }

  async updateInstagramItemAction(
    id: string,
    userId: string,
    action: string,
    projectId?: string
  ): Promise<InstagramItem | undefined> {
    // First verify the item belongs to user
    const [item] = await db
      .select()
      .from(instagramItems)
      .where(and(eq(instagramItems.id, id), eq(instagramItems.userId, userId)));
    
    if (!item) return undefined;
    
    // Now safe to update
    const [updated] = await db
      .update(instagramItems)
      .set({
        userAction: action,
        actionAt: new Date(),
        usedInProject: projectId || null,
      })
      .where(eq(instagramItems.id, id))
      .returning();
    return updated;
  }

  async updateInstagramItemDownloadStatus(
    id: string,
    status: 'pending' | 'downloading' | 'completed' | 'failed',
    localVideoPath?: string,
    localThumbnailPath?: string,
    downloadError?: string
  ): Promise<InstagramItem | undefined> {
    const updateData: Partial<InstagramItem> = {
      downloadStatus: status,
    };
    
    if (localVideoPath !== undefined) {
      updateData.localVideoPath = localVideoPath;
    }
    
    if (localThumbnailPath !== undefined) {
      updateData.localThumbnailPath = localThumbnailPath;
    }
    
    if (downloadError !== undefined) {
      updateData.downloadError = downloadError;
    }
    
    const [item] = await db
      .update(instagramItems)
      .set(updateData)
      .where(eq(instagramItems.id, id))
      .returning();
    return item;
  }

  async updateInstagramItemTranscription(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    transcriptionText?: string,
    language?: string,
    transcriptionError?: string
  ): Promise<InstagramItem | undefined> {
    const updateData: Partial<InstagramItem> = {
      transcriptionStatus: status,
    };
    
    if (transcriptionText !== undefined) {
      updateData.transcriptionText = transcriptionText;
    }
    
    if (language !== undefined) {
      updateData.language = language;
    }
    
    if (transcriptionError !== undefined) {
      updateData.transcriptionError = transcriptionError;
    }
    
    const [item] = await db
      .update(instagramItems)
      .set(updateData)
      .where(eq(instagramItems.id, id))
      .returning();
    return item;
  }

  async updateInstagramItemAiScore(
    id: string,
    aiScore: number,
    aiComment: string,
    freshnessScore?: number,
    viralityScore?: number,
    qualityScore?: number
  ): Promise<InstagramItem | undefined> {
    const updateData: Partial<InstagramItem> = {
      aiScore,
      aiComment,
    };
    
    // Use typeof check to ensure zero values are persisted
    if (typeof freshnessScore === 'number') {
      updateData.freshnessScore = freshnessScore;
    }
    
    if (typeof viralityScore === 'number') {
      updateData.viralityScore = viralityScore;
    }
    
    if (typeof qualityScore === 'number') {
      updateData.qualityScore = qualityScore;
    }
    
    const [item] = await db
      .update(instagramItems)
      .set(updateData)
      .where(eq(instagramItems.id, id))
      .returning();
    return item;
  }

  // Projects
  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string, userId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project;
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async createProject(userId: string, data: Omit<InsertProject, 'userId'>): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({ ...data, userId })
      .returning();
    return project;
  }

  async updateProject(
    id: string,
    userId: string,
    data: Partial<Project>
  ): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return project;
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    await db
      .update(projects)
      .set({ status: 'deleted', deletedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  async permanentlyDeleteProject(id: string, userId: string): Promise<void> {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  // Project Steps
  async getProjectSteps(projectId: string): Promise<ProjectStep[]> {
    // Get all steps first
    const allSteps = await db
      .select()
      .from(projectSteps)
      .where(eq(projectSteps.projectId, projectId))
      .orderBy(desc(projectSteps.updatedAt));
    
    // Group by stepNumber and keep only the latest (first) one for each
    const latestStepsMap = new Map<number, ProjectStep>();
    for (const step of allSteps) {
      if (!latestStepsMap.has(step.stepNumber)) {
        latestStepsMap.set(step.stepNumber, step);
      }
    }
    
    // Convert back to array and sort by stepNumber
    return Array.from(latestStepsMap.values()).sort((a, b) => a.stepNumber - b.stepNumber);
  }

  async createProjectStep(data: InsertProjectStep): Promise<ProjectStep> {
    const [step] = await db
      .insert(projectSteps)
      .values(data)
      .onConflictDoUpdate({
        target: [projectSteps.projectId, projectSteps.stepNumber],
        set: {
          data: sql`excluded.data`,
          completedAt: sql`excluded.completed_at`,
          updatedAt: new Date()
        }
      })
      .returning();
    return step;
  }

  async updateProjectStep(
    id: string,
    data: Partial<ProjectStep>
  ): Promise<ProjectStep | undefined> {
    const [step] = await db
      .update(projectSteps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectSteps.id, id))
      .returning();
    return step;
  }
}

export const storage = new DatabaseStorage();
