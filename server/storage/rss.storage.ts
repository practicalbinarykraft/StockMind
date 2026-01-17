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
  getAllActiveRssSources(): Promise<RssSource[]>;
  updateRssSource(id: string, userId: string, data: Partial<RssSource>): Promise<RssSource | undefined>;
  getRssItemById(id: string): Promise<RssItem | undefined>;
  createRssItemIfNotExists(data: InsertRssItem): Promise<RssItem | null>;
  updateRssItem(id: string, data: Partial<RssItem>): Promise<RssItem | undefined>;
  // Removed: createRssSource, deleteRssSource, getRssItems, getRssItemsBySource, createRssItem, updateRssItemAction, setRssItemFullContent
  // Use modules/rss-sources and modules/news repos instead
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
  }// to do

  async getRssSources(userId: string): Promise<RssSource[]> {
    return await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.userId, userId))
      .orderBy(desc(rssSources.createdAt));
  } // done

  async getAllActiveRssSources(): Promise<RssSource[]> {
    // Get all active RSS sources across all users (for cron job)
    return await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.isActive, true))
      .orderBy(desc(rssSources.createdAt));
  } // done

  async updateRssSource(id: string, userId: string, data: Partial<RssSource>): Promise<RssSource | undefined> {
    const [source] = await db
      .update(rssSources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(rssSources.id, id), eq(rssSources.userId, userId)))
      .returning();
    return source;
  } // done

  async getRssItemById(id: string): Promise<RssItem | undefined> {
    return await db.query.rssItems.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  }

  /**
   * Create RSS item only if (source_id, url) doesn't exist (for background parsing)
   * Returns the item if created, null if already exists for this source
   * Note: Same URL can exist for different sources (multi-user support)
   */
  async createRssItemIfNotExists(data: InsertRssItem): Promise<RssItem | null> {
    const result = await db
      .insert(rssItems)
      .values(data)
      .onConflictDoNothing({ target: [rssItems.sourceId, rssItems.url] })
      .returning();
    return result.length > 0 ? result[0] : null;
  }// to do

  async updateRssItem(id: string, data: Partial<RssItem>): Promise<RssItem | undefined> {
    const [item] = await db.update(rssItems).set(data).where(eq(rssItems.id, id)).returning();
    return item;
  }// to do
}

export const rssStorage = new RssStorage();
