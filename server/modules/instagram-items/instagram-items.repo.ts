import { db } from "../../db";
import { instagramItems } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InstagramItem, InsertInstagramItem } from "@shared/schema";

export class InstagramItemsRepo {
  /**
   * Получить все Instagram items пользователя
   */
  async getAllByUserId(userId: string): Promise<InstagramItem[]> {
    const items = await db
      .select()
      .from(instagramItems)
      .where(eq(instagramItems.userId, userId));

    return items;
  }

  /**
   * Получить все Instagram items пользователя по source ID
   */
  async getAllByUserIdAndSourceId(userId: string, sourceId: string): Promise<InstagramItem[]> {
    const items = await db
      .select()
      .from(instagramItems)
      .where(and(eq(instagramItems.userId, userId), eq(instagramItems.sourceId, sourceId)))
      .orderBy(desc(instagramItems.publishedAt));

    return items;
  }

  /**
   * Получить Instagram item по ID и userId
   */
  async getById(id: string, userId: string): Promise<InstagramItem | undefined> {
    const [item] = await db
      .select()
      .from(instagramItems)
      .where(and(eq(instagramItems.id, id), eq(instagramItems.userId, userId)))
      .limit(1);

    return item;
  }

  /**
   * Получить Instagram items по source ID
   */
  async getBySourceId(sourceId: string): Promise<InstagramItem[]> {
    const items = await db
      .select()
      .from(instagramItems)
      .where(eq(instagramItems.sourceId, sourceId))
      .orderBy(desc(instagramItems.publishedAt));

    return items;
  }

  /**
   * Создать новый Instagram item
   */
  async create(data: InsertInstagramItem): Promise<InstagramItem> {
    const [item] = await db.insert(instagramItems).values(data).returning();
    return item;
  }

  /**
   * Обновить Instagram item
   */
  async update(id: string, data: Partial<InstagramItem>): Promise<InstagramItem | undefined> {
    const [item] = await db
      .update(instagramItems)
      .set(data)
      .where(eq(instagramItems.id, id))
      .returning();

    return item;
  }
}
