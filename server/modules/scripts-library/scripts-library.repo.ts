import { db } from "../../db";
import { scriptsLibrary } from "@shared/schema";
import { eq, and, desc, like } from "drizzle-orm";

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
