// Post Analytics storage operations
import { db } from "../db";
import {
  postAnalytics,
  analyticsSnapshots,
  analyticsFetchQueue,
  type PostAnalytics,
  type InsertPostAnalytics,
  type AnalyticsSnapshot,
  type InsertAnalyticsSnapshot,
} from "@shared/schema";
import { eq, and, desc, lte, gte } from "drizzle-orm";

/**
 * Post Analytics storage interface
 */
export interface IPostAnalyticsStorage {
  getAnalyticsByProject(projectId: string): Promise<PostAnalytics | undefined>;
  createAnalytics(userId: string, data: Omit<InsertPostAnalytics, 'userId'>): Promise<PostAnalytics>;
  updateAnalytics(id: string, data: Partial<PostAnalytics>): Promise<PostAnalytics | undefined>;
  deleteAnalytics(id: string): Promise<void>;
  getLatestSnapshot(analyticsId: string): Promise<AnalyticsSnapshot | undefined>;
  createSnapshot(data: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot>;
  getSnapshots(analyticsId: string, days?: number): Promise<AnalyticsSnapshot[]>;
  getDueAnalytics(): Promise<PostAnalytics[]>;
  createFetchTask(analyticsId: string, scheduledAt: Date): Promise<void>;
  getPendingTasks(): Promise<any[]>;
  updateFetchTask(id: string, data: Partial<any>): Promise<void>;
}

/**
 * Post Analytics storage implementation
 */
export class PostAnalyticsStorage implements IPostAnalyticsStorage {
  /**
   * Get analytics by project ID
   */
  async getAnalyticsByProject(projectId: string): Promise<PostAnalytics | undefined> {
    const result = await db
      .select()
      .from(postAnalytics)
      .where(eq(postAnalytics.projectId, projectId))
      .limit(1);

    return result[0];
  }

  /**
   * Create analytics
   */
  async createAnalytics(userId: string, data: Omit<InsertPostAnalytics, 'userId'>): Promise<PostAnalytics> {
    const trackingEndsAt = new Date();
    trackingEndsAt.setDate(trackingEndsAt.getDate() + (data.trackingDays || 30));
    
    const nextFetchAt = new Date();
    nextFetchAt.setHours(nextFetchAt.getHours() + (data.updateIntervalHours || 6));

    const result = await db
      .insert(postAnalytics)
      .values({
        ...data,
        userId,
        trackingEndsAt,
        nextFetchAt,
        createdAt: new Date(),
      })
      .returning();

    return result[0];
  }

  /**
   * Update analytics
   */
  async updateAnalytics(id: string, data: Partial<PostAnalytics>): Promise<PostAnalytics | undefined> {
    const result = await db
      .update(postAnalytics)
      .set(data)
      .where(eq(postAnalytics.id, id))
      .returning();

    return result[0];
  }

  /**
   * Delete analytics
   */
  async deleteAnalytics(id: string): Promise<void> {
    await db
      .delete(postAnalytics)
      .where(eq(postAnalytics.id, id));
  }

  /**
   * Get latest snapshot
   */
  async getLatestSnapshot(analyticsId: string): Promise<AnalyticsSnapshot | undefined> {
    const result = await db
      .select()
      .from(analyticsSnapshots)
      .where(eq(analyticsSnapshots.analyticsId, analyticsId))
      .orderBy(desc(analyticsSnapshots.fetchedAt))
      .limit(1);

    return result[0];
  }

  /**
   * Create snapshot
   */
  async createSnapshot(data: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot> {
    const result = await db
      .insert(analyticsSnapshots)
      .values({
        ...data,
        fetchedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  /**
   * Get snapshots for analytics
   */
  async getSnapshots(analyticsId: string, days: number = 7): Promise<AnalyticsSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db
      .select()
      .from(analyticsSnapshots)
      .where(and(
        eq(analyticsSnapshots.analyticsId, analyticsId),
        gte(analyticsSnapshots.fetchedAt, cutoffDate)
      ))
      .orderBy(desc(analyticsSnapshots.fetchedAt));
  }

  /**
   * Get analytics that are due for update
   */
  async getDueAnalytics(): Promise<PostAnalytics[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(postAnalytics)
      .where(and(
        eq(postAnalytics.isActive, true),
        eq(postAnalytics.status, 'active'),
        lte(postAnalytics.nextFetchAt, now),
        gte(postAnalytics.trackingEndsAt, now)
      ));
  }

  /**
   * Create fetch task
   */
  async createFetchTask(analyticsId: string, scheduledAt: Date): Promise<void> {
    await db
      .insert(analyticsFetchQueue)
      .values({
        analyticsId,
        scheduledAt,
        status: 'pending',
        retryCount: 0,
      });
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks(): Promise<any[]> {
    const now = new Date();
    
    return await db
      .select({
        task: analyticsFetchQueue,
        analytics: postAnalytics,
      })
      .from(analyticsFetchQueue)
      .innerJoin(postAnalytics, eq(analyticsFetchQueue.analyticsId, postAnalytics.id))
      .where(and(
        eq(analyticsFetchQueue.status, 'pending'),
        lte(analyticsFetchQueue.scheduledAt, now)
      ))
      .orderBy(analyticsFetchQueue.scheduledAt)
      .limit(10);
  }

  /**
   * Update fetch task
   */
  async updateFetchTask(id: string, data: Partial<any>): Promise<void> {
    await db
      .update(analyticsFetchQueue)
      .set(data)
      .where(eq(analyticsFetchQueue.id, id));
  }
}

// Export singleton instance
export const postAnalyticsStorage = new PostAnalyticsStorage();

