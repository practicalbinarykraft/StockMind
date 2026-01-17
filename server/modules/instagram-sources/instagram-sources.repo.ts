import { db } from "../../db";
import { instagramSources } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InstagramSource, InsertInstagramSource } from "@shared/schema";

export class InstagramSourcesRepo {
  /**
   * Получить все Instagram источники пользователя
   */
  async getAllByUserId(userId: string): Promise<InstagramSource[]> {
    const sources = await db
      .select()
      .from(instagramSources)
      .where(eq(instagramSources.userId, userId))
      .orderBy(desc(instagramSources.createdAt));

    return sources;
  }

  /**
   * Создать новый Instagram источник
   */
  async create(userId: string, data: Omit<InsertInstagramSource, 'userId'>): Promise<InstagramSource> {
    const [source] = await db
      .insert(instagramSources)
      .values({ ...data, userId })
      .returning();

    return source;
  }

  /**
   * Получить Instagram источник по ID и userId
   */
  async getById(id: string, userId: string): Promise<InstagramSource | undefined> {
    const [source] = await db
      .select()
      .from(instagramSources)
      .where(and(eq(instagramSources.id, id), eq(instagramSources.userId, userId)))
      .limit(1);

    return source;
  }

  /**
   * Обновить Instagram источник
   */
  async update(id: string, userId: string, data: Partial<InstagramSource>): Promise<InstagramSource | undefined> {
    const [source] = await db
      .update(instagramSources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(instagramSources.id, id), eq(instagramSources.userId, userId)))
      .returning();

    return source;
  }

  /**
   * Удалить Instagram источник
   */
  async delete(id: string, userId: string): Promise<void> {
    await db
      .delete(instagramSources)
      .where(and(eq(instagramSources.id, id), eq(instagramSources.userId, userId)));
  }
}
