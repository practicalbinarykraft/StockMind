import { db } from "../../db";
import { scriptsLibrary } from "@shared/schema";
import { eq, and, or, desc, like } from "drizzle-orm";

/**
 * Repository for Scripts Library
 * Direct database interactions for scripts
 */
export class ScriptsLibraryRepo {
  /**
   * Get all scripts for a user with optional filters
   */
  async getScriptsByUserId(
    userId: string,
    filters?: {
      status?: string;
      sourceType?: string;
      search?: string;
    }
  ) {
    // Build conditions array
    const conditions = [eq(scriptsLibrary.userId, userId)];

    if (filters?.status) {
      conditions.push(eq(scriptsLibrary.status, filters.status));
    }

    if (filters?.sourceType) {
      conditions.push(eq(scriptsLibrary.sourceType, filters.sourceType));
    }

    if (filters?.search) {
      conditions.push(like(scriptsLibrary.title, `%${filters.search}%`));
    }

    const scripts = await db
      .select()
      .from(scriptsLibrary)
      .where(and(...conditions))
      .orderBy(desc(scriptsLibrary.createdAt));

    return scripts;
  }

  /**
   * Get a single script by ID
   */
  async getScriptById(scriptId: string, userId: string) {
    const [script] = await db
      .select()
      .from(scriptsLibrary)
      .where(
        and(eq(scriptsLibrary.id, scriptId), eq(scriptsLibrary.userId, userId))
      )
      .limit(1);

    return script;
  }

  /**
   * Find a script by source ID and source type
   */
  async findBySource(userId: string, sourceId: string, sourceType: string) {
    const [script] = await db
      .select()
      .from(scriptsLibrary)
      .where(
        and(
          eq(scriptsLibrary.userId, userId),
          eq(scriptsLibrary.sourceId, sourceId),
          eq(scriptsLibrary.sourceType, sourceType)
        )
      )
      .limit(1);

    return script;
  }

  /**
   * Get all versions of a script (by parentScriptId or id)
   */
  async getScriptVersions(scriptId: string, userId: string) {
    // Сначала получаем сам скрипт
    const script = await this.getScriptById(scriptId, userId);
    if (!script) return [];

    // Если это версия (есть parentScriptId), получаем все версии родительского скрипта
    const parentId = script.parentScriptId || script.id;

    // Получаем родительский скрипт и все его версии
    const versions = await db
      .select()
      .from(scriptsLibrary)
      .where(
        and(
          eq(scriptsLibrary.userId, userId),
          or(
            eq(scriptsLibrary.id, parentId),
            eq(scriptsLibrary.parentScriptId, parentId)
          )
        )
      )
      .orderBy(scriptsLibrary.version); // По возрастанию (v1, v2, v3...)

    return versions;
  }

  /**
   * Create a new version of a script
   */
  async createScriptVersion(scriptId: string, userId: string, data: any) {
    // Получаем исходный скрипт
    const originalScript = await this.getScriptById(scriptId, userId);
    if (!originalScript) return null;

    // Определяем родительский ID (если это уже версия, используем её parentScriptId)
    const parentId = originalScript.parentScriptId || originalScript.id;

    // Получаем максимальный номер версии
    const versions = await this.getScriptVersions(scriptId, userId);
    const maxVersion = versions.length > 0
      ? Math.max(...versions.map(v => v.version || 1))
      : 1;
    const newVersion = maxVersion + 1;

    // Создаем новую версию
    const [newScript] = await db
      .insert(scriptsLibrary)
      .values({
        ...data,
        userId,
        version: newVersion,
        parentScriptId: parentId,
        status: 'draft', // Новая версия всегда черновик
      })
      .returning();

    return newScript;
  }

  /**
   * Create a new script
   */
  async createScript(userId: string, data: any) {
    const [script] = await db
      .insert(scriptsLibrary)
      .values({
        ...data,
        userId,
      })
      .returning();

    return script;
  }

  /**
   * Update a script
   */
  async updateScript(scriptId: string, userId: string, data: any) {
    const [script] = await db
      .update(scriptsLibrary)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(scriptsLibrary.id, scriptId), eq(scriptsLibrary.userId, userId))
      )
      .returning();

    return script;
  }

  /**
   * Delete a script
   */
  async deleteScript(scriptId: string, userId: string) {
    const [script] = await db
      .delete(scriptsLibrary)
      .where(
        and(eq(scriptsLibrary.id, scriptId), eq(scriptsLibrary.userId, userId))
      )
      .returning();

    return script;
  }

  /**
   * Link script to project
   */
  async linkScriptToProject(scriptId: string, projectId: string) {
    const [script] = await db
      .update(scriptsLibrary)
      .set({
        projectId,
        updatedAt: new Date(),
      })
      .where(eq(scriptsLibrary.id, scriptId))
      .returning();

    return script;
  }
}
