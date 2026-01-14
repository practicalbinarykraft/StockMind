// Instagram storage operations
import { db } from "../db";
import {
  instagramSources,
  instagramItems,
  type InstagramSource,
  type InsertInstagramSource,
  type InstagramItem,
  type InsertInstagramItem,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IInstagramStorage {
  getInstagramSources(userId: string): Promise<InstagramSource[]>;
  createInstagramSource(userId: string, data: Omit<InsertInstagramSource, 'userId'>): Promise<InstagramSource>;
  updateInstagramSource(id: string, userId: string, data: Partial<InstagramSource>): Promise<InstagramSource | undefined>;
  deleteInstagramSource(id: string, userId: string): Promise<void>;
  getInstagramItems(userId: string, sourceId?: string): Promise<InstagramItem[]>;
  getInstagramItemsBySource(sourceId: string): Promise<InstagramItem[]>;
  createInstagramItem(data: InsertInstagramItem): Promise<InstagramItem>;
  updateInstagramItem(id: string, data: Partial<InstagramItem>): Promise<InstagramItem | undefined>;
  updateInstagramItemAction(id: string, userId: string, action: string, projectId?: string): Promise<InstagramItem | undefined>;
  updateInstagramItemDownloadStatus(id: string, status: 'pending' | 'downloading' | 'completed' | 'failed', localVideoPath?: string, localThumbnailPath?: string, downloadError?: string): Promise<InstagramItem | undefined>;
  updateInstagramItemTranscription(id: string, status: 'pending' | 'processing' | 'completed' | 'failed', transcriptionText?: string, language?: string, transcriptionError?: string): Promise<InstagramItem | undefined>;
  updateInstagramItemAiScore(id: string, aiScore: number, aiComment: string, freshnessScore?: number, viralityScore?: number, qualityScore?: number): Promise<InstagramItem | undefined>;
}

export class InstagramStorage implements IInstagramStorage {
  async getInstagramSources(userId: string): Promise<InstagramSource[]> {
    return await db.select().from(instagramSources).where(eq(instagramSources.userId, userId)).orderBy(desc(instagramSources.createdAt));
  }// done

  async createInstagramSource(userId: string, data: Omit<InsertInstagramSource, 'userId'>): Promise<InstagramSource> {
    const [source] = await db.insert(instagramSources).values({ ...data, userId }).returning();
    return source;
  }// done

  async updateInstagramSource(id: string, userId: string, data: Partial<InstagramSource>): Promise<InstagramSource | undefined> {
    const [source] = await db.update(instagramSources).set({ ...data, updatedAt: new Date() }).where(and(eq(instagramSources.id, id), eq(instagramSources.userId, userId))).returning();
    return source;
  }// done

  async deleteInstagramSource(id: string, userId: string): Promise<void> {
    await db.delete(instagramSources).where(and(eq(instagramSources.id, id), eq(instagramSources.userId, userId)));
  } // done

  async getInstagramItems(userId: string, sourceId?: string): Promise<InstagramItem[]> {
    if (sourceId) {
      return await db.select().from(instagramItems).where(and(eq(instagramItems.userId, userId), eq(instagramItems.sourceId, sourceId))).orderBy(desc(instagramItems.publishedAt));
    }

    const items = await db.select().from(instagramItems).where(eq(instagramItems.userId, userId));
    return items.sort((a, b) => {
      if (a.aiScore === null && b.aiScore === null) {
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate;
      }
      if (a.aiScore === null) return 1;
      if (b.aiScore === null) return -1;
      if (b.aiScore !== a.aiScore) return b.aiScore - a.aiScore;
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    });
  }// done

  async getInstagramItemsBySource(sourceId: string): Promise<InstagramItem[]> {
    return await db.select().from(instagramItems).where(eq(instagramItems.sourceId, sourceId)).orderBy(desc(instagramItems.publishedAt));
  }// done

  async createInstagramItem(data: InsertInstagramItem): Promise<InstagramItem> {
    const [item] = await db.insert(instagramItems).values(data).returning();
    return item;
  }// done

  async updateInstagramItem(id: string, data: Partial<InstagramItem>): Promise<InstagramItem | undefined> {
    const [item] = await db.update(instagramItems).set(data).where(eq(instagramItems.id, id)).returning();
    return item;
  }// done

  async updateInstagramItemAction(id: string, userId: string, action: string, projectId?: string): Promise<InstagramItem | undefined> {
    const [item] = await db.select().from(instagramItems).where(and(eq(instagramItems.id, id), eq(instagramItems.userId, userId)));
    if (!item) return undefined;

    const [updated] = await db.update(instagramItems).set({ userAction: action, actionAt: new Date(), usedInProject: projectId || null }).where(eq(instagramItems.id, id)).returning();
    return updated;
  }// done

  async updateInstagramItemDownloadStatus(id: string, status: 'pending' | 'downloading' | 'completed' | 'failed', localVideoPath?: string, localThumbnailPath?: string, downloadError?: string): Promise<InstagramItem | undefined> {
    const updateData: Partial<InstagramItem> = { downloadStatus: status };
    if (localVideoPath !== undefined) updateData.localVideoPath = localVideoPath;
    if (localThumbnailPath !== undefined) updateData.localThumbnailPath = localThumbnailPath;
    if (downloadError !== undefined) updateData.downloadError = downloadError;

    const [item] = await db.update(instagramItems).set(updateData).where(eq(instagramItems.id, id)).returning();
    return item;
  }// done

  async updateInstagramItemTranscription(id: string, status: 'pending' | 'processing' | 'completed' | 'failed', transcriptionText?: string, language?: string, transcriptionError?: string): Promise<InstagramItem | undefined> {
    const updateData: Partial<InstagramItem> = { transcriptionStatus: status };
    if (transcriptionText !== undefined) updateData.transcriptionText = transcriptionText;
    if (language !== undefined) updateData.language = language;
    if (transcriptionError !== undefined) updateData.transcriptionError = transcriptionError;

    const [item] = await db.update(instagramItems).set(updateData).where(eq(instagramItems.id, id)).returning();
    return item;
  }// done

  async updateInstagramItemAiScore(id: string, aiScore: number, aiComment: string, freshnessScore?: number, viralityScore?: number, qualityScore?: number): Promise<InstagramItem | undefined> {
    const updateData: Partial<InstagramItem> = { aiScore, aiComment };
    if (typeof freshnessScore === 'number') updateData.freshnessScore = freshnessScore;
    if (typeof viralityScore === 'number') updateData.viralityScore = viralityScore;
    if (typeof qualityScore === 'number') updateData.qualityScore = qualityScore;

    const [item] = await db.update(instagramItems).set(updateData).where(eq(instagramItems.id, id)).returning();
    return item;
  }// done
}

export const instagramStorage = new InstagramStorage();
