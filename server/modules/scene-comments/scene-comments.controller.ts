import type { Request, Response } from "express";
import { sceneCommentsService } from "./scene-comments.service";
import { 
  CreateSceneCommentDto, 
  GetScriptCommentsDto,
  GetSceneCommentsDto,
  DeleteCommentDto 
} from "./scene-comments.dto";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";

export const sceneCommentsController = {
  /**
   * POST /api/scene-comments
   * Create a new scene comment
   */
  async createComment(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = CreateSceneCommentDto.parse(req.body);
      const comment = await sceneCommentsService.createComment(userId, data);

      logger.info("Scene comment created", {
        userId,
        commentId: comment.id,
        scriptId: data.scriptId,
      });

      return res.status(201).json({ data: comment });
    } catch (error: any) {
      logger.error("Error creating scene comment", {
        error: error.message,
        body: req.body,
      });
      return res.status(400).json({ message: error.message });
    }
  },

  /**
   * GET /api/scene-comments/:scriptId
   * Get all comments for a script
   */
  async getScriptComments(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { scriptId } = GetScriptCommentsDto.parse(req.params);
      const comments = await sceneCommentsService.getScriptComments(scriptId);

      return res.json({ data: comments });
    } catch (error: any) {
      logger.error("Error fetching script comments", {
        error: error.message,
        scriptId: req.params.scriptId,
      });
      return res.status(500).json({ message: "Failed to fetch comments" });
    }
  },

  /**
   * GET /api/scene-comments/:scriptId/scenes/:sceneId
   * Get comments for a specific scene
   */
  async getSceneComments(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { scriptId, sceneId } = GetSceneCommentsDto.parse(req.params);
      const comments = await sceneCommentsService.getSceneComments(
        scriptId,
        sceneId
      );

      return res.json({ data: comments });
    } catch (error: any) {
      logger.error("Error fetching scene comments", {
        error: error.message,
        scriptId: req.params.scriptId,
        sceneId: req.params.sceneId,
      });
      return res.status(500).json({ message: "Failed to fetch comments" });
    }
  },

  /**
   * DELETE /api/scene-comments/:id
   * Delete a comment
   */
  async deleteComment(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { id } = DeleteCommentDto.parse(req.params);
      await sceneCommentsService.deleteComment(id, userId);

      logger.info("Scene comment deleted", {
        userId,
        commentId: id,
      });

      return res.json({ success: true });
    } catch (error: any) {
      logger.error("Error deleting scene comment", {
        error: error.message,
        commentId: req.params.id,
      });
      return res.status(500).json({ message: "Failed to delete comment" });
    }
  },
};
