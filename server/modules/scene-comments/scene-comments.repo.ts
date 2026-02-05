// Scene Comments repository operations
import { db } from "../../db";
import { sceneComments, type SceneComment, type InsertSceneComment } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class SceneCommentsRepository {
  /**
   * Create a new scene comment
   */
  async create(data: InsertSceneComment): Promise<SceneComment> {
    const [comment] = await db
      .insert(sceneComments)
      .values(data)
      .returning();
    return comment;
  }

  /**
   * Get all comments for a script
   */
  async getByScriptId(scriptId: string): Promise<SceneComment[]> {
    return await db
      .select()
      .from(sceneComments)
      .where(eq(sceneComments.scriptId, scriptId))
      .orderBy(desc(sceneComments.createdAt));
  }

  /**
   * Get comments for a specific scene
   */
  async getBySceneId(scriptId: string, sceneId: string): Promise<SceneComment[]> {
    return await db
      .select()
      .from(sceneComments)
      .where(
        and(
          eq(sceneComments.scriptId, scriptId),
          eq(sceneComments.sceneId, sceneId)
        )
      )
      .orderBy(desc(sceneComments.createdAt));
  }

  /**
   * Get a comment by ID
   */
  async getById(id: string): Promise<SceneComment | undefined> {
    const [comment] = await db
      .select()
      .from(sceneComments)
      .where(eq(sceneComments.id, id))
      .limit(1);
    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteById(id: string): Promise<void> {
    await db
      .delete(sceneComments)
      .where(eq(sceneComments.id, id));
  }
}

export const sceneCommentsRepo = new SceneCommentsRepository();
