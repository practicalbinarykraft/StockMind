// RSS storage operations
import { db } from "../db";
import {
  rssSources,
  rssItems,
  type RssSource,
  type InsertRssSource,
  type RssItem,
  type InsertRssItem,
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export interface IRssStorage {
  getRssSources(userId: string): Promise<RssSource[]>;
  getAllActiveRssSources(): Promise<RssSource[]>; // Get all active sources across all users (for cron)
  createRssSource(userId: string, data: Omit<InsertRssSource, 'userId'>): Promise<RssSource>;
  updateRssSource(id: string, userId: string, data: Partial<RssSource>): Promise<RssSource | undefined>;
  deleteRssSource(id: string, userId: string): Promise<void>;
  getRssItems(userId?: string): Promise<Array<RssItem & { sourceName: string }>>;
  getRssItemsBySource(sourceId: string): Promise<RssItem[]>;
  getRssItemById(id: string): Promise<RssItem | undefined>;
  createRssItem(data: InsertRssItem): Promise<RssItem>;
  createRssItemIfNotExists(data: InsertRssItem): Promise<RssItem | null>;
  updateRssItem(id: string, data: Partial<RssItem>): Promise<RssItem | undefined>;
  updateRssItemAction(id: string, userId: string, action: string, projectId?: string): Promise<RssItem | undefined>;
  setRssItemFullContent(id: string, content: string): Promise<void>;
}

export class RssStorage implements IRssStorage {
  /**
   * Parse JSONB field from string to object if needed
   */
  private parseJsonbField(value: any): any {
    if (!value || value === null || value === '') return null;
    if (typeof value === 'object') return value;
    if (typeof value === 'string' && value.trim().startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  }

  async getRssSources(userId: string): Promise<RssSource[]> {
    return await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.userId, userId))
      .orderBy(desc(rssSources.createdAt));
  }

  async getAllActiveRssSources(): Promise<RssSource[]> {
    // Get all active RSS sources across all users (for cron job)
    return await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.isActive, true))
      .orderBy(desc(rssSources.createdAt));
  }

  async createRssSource(userId: string, data: Omit<InsertRssSource, 'userId'>): Promise<RssSource> {
    const [source] = await db
      .insert(rssSources)
      .values({ ...data, userId })
      .returning();
    return source;
  }

  async updateRssSource(id: string, userId: string, data: Partial<RssSource>): Promise<RssSource | undefined> {
    const [source] = await db
      .update(rssSources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(rssSources.id, id), eq(rssSources.userId, userId)))
      .returning();
    return source;
  }

  async deleteRssSource(id: string, userId: string): Promise<void> {
    await db.delete(rssSources).where(and(eq(rssSources.id, id), eq(rssSources.userId, userId)));
  }

  async getRssItems(userId?: string): Promise<Array<RssItem & { sourceName: string }>> {
    if (userId) {
      const userSources = await this.getRssSources(userId);
      const sourceIds = userSources.map(s => s.id);
      if (sourceIds.length === 0) return [];

      const sourceNameMap = new Map(userSources.map(s => [s.id, s.name]));
      const sourceItems = await db
        .select()
        .from(rssItems)
        .where(inArray(rssItems.sourceId, sourceIds));

      const allItems: Array<RssItem & { sourceName: string }> = sourceItems.map(item => {
        const articleAnalysis = this.parseJsonbField((item as any).articleAnalysis);
        const articleTranslation = this.parseJsonbField((item as any).articleTranslation);
        
        return {
          ...item,
          sourceName: sourceNameMap.get(item.sourceId) || 'Unknown Source',
          articleAnalysis: articleAnalysis || undefined,
          articleTranslation: articleTranslation || undefined,
        };
      });

      return allItems.sort((a, b) => {
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
    }

    return await db
      .select()
      .from(rssItems)
      .orderBy(desc(rssItems.aiScore))
      .then(items => items.map(item => ({ ...item, sourceName: 'Unknown Source' })));
  }

  async getRssItemsBySource(sourceId: string): Promise<RssItem[]> {
    return await db
      .select()
      .from(rssItems)
      .where(eq(rssItems.sourceId, sourceId))
      .orderBy(desc(rssItems.publishedAt));
  }

  async createRssItem(data: InsertRssItem): Promise<RssItem> {
    const [item] = await db.insert(rssItems).values(data).returning();
    return item;
  }

  /**
   * Create RSS item only if URL doesn't exist (for background parsing)
   * Returns the item if created, null if already exists
   */
  async createRssItemIfNotExists(data: InsertRssItem): Promise<RssItem | null> {
    const result = await db
      .insert(rssItems)
      .values(data)
      .onConflictDoNothing({ target: rssItems.url })
      .returning();
    return result.length > 0 ? result[0] : null;
  }

  async updateRssItem(id: string, data: Partial<RssItem>): Promise<RssItem | undefined> {
    const [item] = await db.update(rssItems).set(data).where(eq(rssItems.id, id)).returning();
    return item;
  }

  async updateRssItemAction(
    id: string,
    userId: string,
    action: string,
    projectId?: string
  ): Promise<RssItem | undefined> {
    const [item] = await db.select().from(rssItems).where(eq(rssItems.id, id));
    if (!item) return undefined;

    const userSources = await this.getRssSources(userId);
    const sourceIds = userSources.map(s => s.id);
    if (!sourceIds.includes(item.sourceId)) return undefined;

    const [updated] = await db
      .update(rssItems)
      .set({
        userAction: action,
        actionAt: new Date(),
        usedInProject: projectId || null,
        userId,
      })
      .where(eq(rssItems.id, id))
      .returning();
    return updated;
  }

  async getRssItemById(id: string): Promise<RssItem | undefined> {
    return await db.query.rssItems.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  }

  async setRssItemFullContent(id: string, content: string): Promise<void> {
    await db.update(rssItems).set({ fullContent: content, lastFetchedAt: new Date() }).where(eq(rssItems.id, id));
  }
}

export const rssStorage = new RssStorage();
