import { db } from "../../db";
import { rssSources, rssItems } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { RssSource, InsertRssSource, RssItem } from "@shared/schema";

export class RssSourcesRepo {
  /**
   * Получить все RSS источники пользователя
   */
  async getAllByUserId(userId: string): Promise<RssSource[]> {
    const sources = await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.userId, userId))
      .orderBy(desc(rssSources.createdAt));

    return sources;
  }

  /**
   * Получить все активные RSS источники всех пользователей (для cron)
   */
  async getAllActive(): Promise<RssSource[]> {
    const sources = await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.isActive, true))
      .orderBy(desc(rssSources.createdAt));

    return sources;
  }

  /**
   * Создать новый RSS источник
   */
  async create(userId: string, data: Omit<InsertRssSource, 'userId'>): Promise<RssSource> {
    const [source] = await db
      .insert(rssSources)
      .values({ ...data, userId })
      .returning();

    return source;
  }

  /**
   * Получить RSS источник по ID и userId
   */
  async getById(id: string, userId: string): Promise<RssSource | undefined> {
    const [source] = await db
      .select()
      .from(rssSources)
      .where(and(eq(rssSources.id, id), eq(rssSources.userId, userId)))
      .limit(1);

    return source;
  }

  /**
   * Обновить RSS источник
   */
  async update(id: string, userId: string, data: Partial<RssSource>): Promise<RssSource | undefined> {
    const [source] = await db
      .update(rssSources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(rssSources.id, id), eq(rssSources.userId, userId)))
      .returning();

    return source;
  }

  /**
   * Удалить RSS источник
   */
  async delete(id: string, userId: string): Promise<void> {
    await db
      .delete(rssSources)
      .where(and(eq(rssSources.id, id), eq(rssSources.userId, userId)));
  }

  /**
   * Проверить принадлежность источника пользователю
   */
  async verifyOwnership(sourceId: string, userId: string): Promise<boolean> {
    const [source] = await db
      .select()
      .from(rssSources)
      .where(and(eq(rssSources.id, sourceId), eq(rssSources.userId, userId)))
      .limit(1);

    return !!source;
  }
}
