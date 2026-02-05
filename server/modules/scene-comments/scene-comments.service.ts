import { sceneCommentsRepo } from "./scene-comments.repo";
import type { CreateSceneCommentDto } from "./scene-comments.dto";
import type { SceneComment } from "@shared/schema";

export const sceneCommentsService = {
  /**
   * Create a new scene comment
   */
  async createComment(
    userId: string,
    data: CreateSceneCommentDto
  ): Promise<SceneComment> {
    return await sceneCommentsRepo.create({
      userId,
      ...data,
    });
  },

  /**
   * Get all comments for a script
   */
  async getScriptComments(scriptId: string): Promise<SceneComment[]> {
    return await sceneCommentsRepo.getByScriptId(scriptId);
  },

  /**
   * Get comments for a specific scene
   */
  async getSceneComments(
    scriptId: string,
    sceneId: string
  ): Promise<SceneComment[]> {
    return await sceneCommentsRepo.getBySceneId(scriptId, sceneId);
  },

  /**
   * Delete a comment
   */
  async deleteComment(id: string, userId: string): Promise<void> {
    // Verify ownership
    const comment = await sceneCommentsRepo.getById(id);
    if (!comment) {
      throw new Error("Comment not found");
    }
    
    if (comment.userId !== userId) {
      throw new Error("Access denied");
    }
    
    await sceneCommentsRepo.deleteById(id);
  },
};
