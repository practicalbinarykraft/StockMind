// Scripts Library storage operations
import { db } from "../db";
import {
  scriptsLibrary,
  type ScriptLibrary,
  type InsertScriptLibrary,
} from "@shared/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";

/**
 * Scripts Library storage interface
 */
export interface IScriptsLibraryStorage {
  getScripts(userId: string, filters?: {
    status?: string;
    sourceType?: string;
    search?: string;
  }): Promise<ScriptLibrary[]>;
  getScript(id: string, userId: string): Promise<ScriptLibrary | undefined>;
  createScript(userId: string, data: Omit<InsertScriptLibrary, 'userId'>): Promise<ScriptLibrary>;
  updateScript(id: string, userId: string, data: Partial<ScriptLibrary>): Promise<ScriptLibrary | undefined>;
  deleteScript(id: string, userId: string): Promise<void>;
  getScriptsByStatus(userId: string, status: string): Promise<ScriptLibrary[]>;
  getScriptsByProject(projectId: string): Promise<ScriptLibrary | undefined>;
  updateScriptProject(scriptId: string, projectId: string | null): Promise<void>;
}

/**
 * Scripts Library storage implementation
 */
export class ScriptsLibraryStorage implements IScriptsLibraryStorage {
  /**
   * Get all scripts for a user with optional filters
   */
  async getScripts(userId: string, filters?: {
    status?: string;
    sourceType?: string;
    search?: string;
  }): Promise<ScriptLibrary[]> {
    let query = db
      .select()
      .from(scriptsLibrary)
      .where(eq(scriptsLibrary.userId, userId))
      .orderBy(desc(scriptsLibrary.updatedAt));

    if (filters?.status && filters.status !== 'all') {
      query = query.where(and(
        eq(scriptsLibrary.userId, userId),
        eq(scriptsLibrary.status, filters.status)
      )) as any;
    }

    if (filters?.sourceType && filters.sourceType !== 'all') {
      query = query.where(and(
        eq(scriptsLibrary.userId, userId),
        eq(scriptsLibrary.sourceType, filters.sourceType)
      )) as any;
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(and(
        eq(scriptsLibrary.userId, userId),
        or(
          sql`${scriptsLibrary.title} ILIKE ${searchTerm}`,
          sql`${scriptsLibrary.fullText} ILIKE ${searchTerm}`
        )
      )) as any;
    }

    return await query;
  }

  /**
   * Get a single script by ID
   */
  async getScript(id: string, userId: string): Promise<ScriptLibrary | undefined> {
    const result = await db
      .select()
      .from(scriptsLibrary)
      .where(and(
        eq(scriptsLibrary.id, id),
        eq(scriptsLibrary.userId, userId)
      ))
      .limit(1);

    return result[0];
  }

  /**
   * Create a new script
   */
  async createScript(userId: string, data: Omit<InsertScriptLibrary, 'userId'>): Promise<ScriptLibrary> {
    const result = await db
      .insert(scriptsLibrary)
      .values({
        ...data,
        userId,
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  /**
   * Update a script
   */
  async updateScript(id: string, userId: string, data: Partial<ScriptLibrary>): Promise<ScriptLibrary | undefined> {
    const result = await db
      .update(scriptsLibrary)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(scriptsLibrary.id, id),
        eq(scriptsLibrary.userId, userId)
      ))
      .returning();

    return result[0];
  }

  /**
   * Delete a script
   */
  async deleteScript(id: string, userId: string): Promise<void> {
    await db
      .delete(scriptsLibrary)
      .where(and(
        eq(scriptsLibrary.id, id),
        eq(scriptsLibrary.userId, userId)
      ));
  }

  /**
   * Get scripts by status
   */
  async getScriptsByStatus(userId: string, status: string): Promise<ScriptLibrary[]> {
    return await db
      .select()
      .from(scriptsLibrary)
      .where(and(
        eq(scriptsLibrary.userId, userId),
        eq(scriptsLibrary.status, status)
      ))
      .orderBy(desc(scriptsLibrary.updatedAt));
  }

  /**
   * Get script by project ID
   */
  async getScriptsByProject(projectId: string): Promise<ScriptLibrary | undefined> {
    const result = await db
      .select()
      .from(scriptsLibrary)
      .where(eq(scriptsLibrary.projectId, projectId))
      .limit(1);

    return result[0];
  }

  /**
   * Update script's project reference
   */
  async updateScriptProject(scriptId: string, projectId: string | null): Promise<void> {
    await db
      .update(scriptsLibrary)
      .set({
        projectId,
        status: projectId ? 'in_production' : 'ready',
        updatedAt: new Date(),
      })
      .where(eq(scriptsLibrary.id, scriptId));
  }
}

// Export singleton instance
export const scriptsLibraryStorage = new ScriptsLibraryStorage();

