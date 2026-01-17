import { db } from "../../db";
import { rssItems } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { RssItem, InsertRssItem } from "@shared/schema";

/**
 * News Repository
 * 
 * Содержит только прямые запросы к БД для rssItems.
 * Вся логика находится в news.service.
 */
export class NewsRepo {

  /**
   * Получить все RSS items по sourceIds
   */
  async getAllBySourceIds(sourceIds: string[]): Promise<RssItem[]> {
    if (sourceIds.length === 0) return [];

    const items = await db
      .select()
      .from(rssItems)
      .where(inArray(rssItems.sourceId, sourceIds));

    return items;
  }

  /**
   * Получить RSS items по конкретному sourceId
   */
  async getBySourceId(sourceId: string): Promise<RssItem[]> {
    const items = await db
      .select()
      .from(rssItems)
      .where(eq(rssItems.sourceId, sourceId))
      .orderBy(desc(rssItems.publishedAt));

    return items;
  }

  /**
   * Получить RSS item по ID
   */
  async getById(id: string): Promise<RssItem | undefined> {
    const [item] = await db
      .select()
      .from(rssItems)
      .where(eq(rssItems.id, id))
      .limit(1);

    return item;
  }

  /**
   * Создать новый RSS item
   */
  async create(data: InsertRssItem): Promise<RssItem> {
    const [item] = await db
      .insert(rssItems)
      .values(data)
      .returning();

    return item;
  }

  /**
   * Создать RSS item только если (sourceId, url) не существует
   * Возвращает item если создан, null если уже существует
   */
  async createIfNotExists(data: InsertRssItem): Promise<RssItem | null> {
    const result = await db
      .insert(rssItems)
      .values(data)
      .onConflictDoNothing({ target: [rssItems.sourceId, rssItems.url] })
      .returning();

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Обновить RSS item
   */
  async update(id: string, data: Partial<RssItem>): Promise<RssItem | undefined> {
    const [item] = await db
      .update(rssItems)
      .set(data)
      .where(eq(rssItems.id, id))
      .returning();

    return item;
  }

  /**
   * Обновить userAction для RSS item
   */
  async updateAction(
    id: string,
    userId: string,
    action: string,
    projectId?: string
  ): Promise<RssItem | undefined> {
    const [item] = await db
      .update(rssItems)
      .set({
        userAction: action,
        actionAt: new Date(),
        usedInProject: projectId || null,
        userId,
      })
      .where(eq(rssItems.id, id))
      .returning();

    return item;
  }

  /**
   * Установить полный контент статьи (после web scraping)
   */
  async setFullContent(id: string, content: string): Promise<void> {
    await db
      .update(rssItems)
      .set({
        fullContent: content,
        lastFetchedAt: new Date(),
      })
      .where(eq(rssItems.id, id));
  }

  /**
   * Обновить isFavorite статус
   */
  async updateFavorite(
    id: string,
    isFavorite: boolean,
    favoritedAt: Date | null,
    userNotes?: string | null
  ): Promise<RssItem | undefined> {
    const updateData: Partial<RssItem> = {
      isFavorite,
      favoritedAt,
    };

    if (userNotes !== undefined) {
      updateData.userNotes = userNotes;
    }

    const [item] = await db
      .update(rssItems)
      .set(updateData)
      .where(eq(rssItems.id, id))
      .returning();

    return item;
  }
}
