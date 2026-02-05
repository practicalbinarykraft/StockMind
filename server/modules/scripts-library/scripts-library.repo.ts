import { db } from "../../db";
import { scriptsLibrary, scriptCheckpoints, editorOperationLog } from "@shared/schema";
import { eq, and, or, desc, like, lte, inArray } from "drizzle-orm";

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

  // ============================================================================
  // CHECKPOINT OPERATIONS
  // ============================================================================

  /**
   * Create a checkpoint for a script
   */
  async createCheckpoint(data: {
    scriptId: string;
    userId: string;
    reason: string;
    scenes: any;
    fullText: string;
    metadata?: any;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // TTL = 7 дней

    const [checkpoint] = await db
      .insert(scriptCheckpoints)
      .values({
        scriptId: data.scriptId,
        userId: data.userId,
        kind: 'checkpoint',
        reason: data.reason,
        scenes: data.scenes,
        fullText: data.fullText,
        metadata: data.metadata || {},
        expiresAt,
      })
      .returning();

    // Обновить last_checkpoint_at в scripts_library
    await db
      .update(scriptsLibrary)
      .set({ lastCheckpointAt: new Date() })
      .where(eq(scriptsLibrary.id, data.scriptId));

    return checkpoint;
  }

  /**
   * Get latest checkpoint for a script
   */
  async getLatestCheckpoint(scriptId: string, userId: string) {
    const [checkpoint] = await db
      .select()
      .from(scriptCheckpoints)
      .where(
        and(
          eq(scriptCheckpoints.scriptId, scriptId),
          eq(scriptCheckpoints.userId, userId)
        )
      )
      .orderBy(desc(scriptCheckpoints.createdAt))
      .limit(1);

    return checkpoint || null;
  }

  /**
   * Get checkpoints by reasons (для recovery UI)
   */
  async getCheckpointsByReason(scriptId: string, userId: string, reasons: string[]) {
    const checkpoints = await db
      .select()
      .from(scriptCheckpoints)
      .where(
        and(
          eq(scriptCheckpoints.scriptId, scriptId),
          eq(scriptCheckpoints.userId, userId),
          inArray(scriptCheckpoints.reason, reasons)
        )
      )
      .orderBy(desc(scriptCheckpoints.createdAt))
      .limit(10);

    return checkpoints;
  }

  /**
   * Get checkpoint by ID
   */
  async getCheckpointById(checkpointId: string, userId: string) {
    const [checkpoint] = await db
      .select()
      .from(scriptCheckpoints)
      .where(
        and(
          eq(scriptCheckpoints.id, checkpointId),
          eq(scriptCheckpoints.userId, userId)
        )
      )
      .limit(1);

    return checkpoint || null;
  }

  /**
   * Delete expired checkpoints (для cron job)
   */
  async deleteExpiredCheckpoints() {
    const now = new Date();
    const deleted = await db
      .delete(scriptCheckpoints)
      .where(lte(scriptCheckpoints.expiresAt, now))
      .returning();

    return deleted.length;
  }

  /**
   * Delete specific checkpoint
   */
  async deleteCheckpoint(checkpointId: string, userId: string) {
    const [deleted] = await db
      .delete(scriptCheckpoints)
      .where(
        and(
          eq(scriptCheckpoints.id, checkpointId),
          eq(scriptCheckpoints.userId, userId)
        )
      )
      .returning();

    return deleted;
  }

  // ============================================================================
  // EDITOR OPERATION LOG
  // ============================================================================

  /**
   * Log an editor operation
   */
  async logOperation(data: {
    scriptId: string;
    userId: string;
    operationType: string;
    sceneId?: string;
    details?: any;
  }) {
    const [log] = await db
      .insert(editorOperationLog)
      .values({
        scriptId: data.scriptId,
        userId: data.userId,
        operationType: data.operationType,
        sceneId: data.sceneId || null,
        details: data.details || {},
      })
      .returning();

    return log;
  }

  /**
   * Get operation log for a script
   */
  async getOperationLog(scriptId: string, userId: string, limit: number = 50) {
    const logs = await db
      .select()
      .from(editorOperationLog)
      .where(
        and(
          eq(editorOperationLog.scriptId, scriptId),
          eq(editorOperationLog.userId, userId)
        )
      )
      .orderBy(desc(editorOperationLog.createdAt))
      .limit(limit);

    return logs;
  }

  /**
   * Save working state (обновить рабочее состояние без создания версии)
   */
  async saveWorkingState(scriptId: string, userId: string, data: {
    scenes: any[];
    fullText: string;
    editorState: any;
  }) {
    const [script] = await db
      .update(scriptsLibrary)
      .set({
        scenes: data.scenes,
        fullText: data.fullText,
        editorState: data.editorState,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scriptsLibrary.id, scriptId),
          eq(scriptsLibrary.userId, userId)
        )
      )
      .returning();

    return script;
  }
}
