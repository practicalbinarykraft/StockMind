import { db } from "../../db";
import { scriptsMedia } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Repository для Scripts Media
 * Прямые операции с БД
 */
export class ScriptsMediaRepo {
  /**
   * Получить медиа по scriptId
   */
  async getByScriptId(scriptId: string) {
    const [media] = await db
      .select()
      .from(scriptsMedia)
      .where(eq(scriptsMedia.scriptId, scriptId))
      .limit(1);

    return media || null;
  }

  /**
   * Создать запись медиа
   */
  async create(scriptId: string, data: any) {
    const [media] = await db
      .insert(scriptsMedia)
      .values({
        scriptId,
        ...data,
      })
      .returning();

    return media;
  }

  /**
   * Обновить медиа
   */
  async update(scriptId: string, data: any) {
    const [media] = await db
      .update(scriptsMedia)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(scriptsMedia.scriptId, scriptId))
      .returning();

    return media || null;
  }

  /**
   * Upsert медиа (создать или обновить)
   */
  async upsert(scriptId: string, data: any) {
    const existing = await this.getByScriptId(scriptId);

    if (existing) {
      return this.update(scriptId, data);
    } else {
      return this.create(scriptId, data);
    }
  }

  /**
   * Удалить медиа
   */
  async delete(scriptId: string) {
    const [deleted] = await db
      .delete(scriptsMedia)
      .where(eq(scriptsMedia.scriptId, scriptId))
      .returning();

    return deleted || null;
  }
}
