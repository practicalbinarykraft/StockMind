import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { autoScriptsService } from "./auto-scripts.service";
import {
  GetScriptsQueryDto,
  ScriptIdParamDto,
  RejectScriptDto,
  ReviseScriptDto,
  FeedbackHistoryQueryDto,
} from "./auto-scripts.dto";
import {
  AutoScriptNotFoundError,
  AutoScriptAccessDeniedError,
  InvalidScriptStatusError,
  MaxRevisionsReachedError,
  RevisionNotStuckError,
  NoApiKeyConfiguredError,
} from "./auto-scripts.errors";
import { z } from "zod";

/**
 * Controller for Auto Scripts
 * Handles req/res, validation, HTTP status codes
 */
export const autoScriptsController = {
  /**
   * GET /api/auto-scripts/rejection-categories
   * Get available rejection categories
   */
  async getRejectionCategories(req: Request, res: Response) {
    const categories = autoScriptsService.getRejectionCategories();
    return res.json({ categories });
  },

  /**
   * GET /api/auto-scripts/writing-profile
   * Get user's writing profile and AI summary
   */
  async getWritingProfile(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const profile = await autoScriptsService.getWritingProfile(userId);

      return res.json(profile);
    } catch (error: any) {
      logger.error("Error fetching writing profile", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch writing profile" });
    }
  },

  /**
   * POST /api/auto-scripts/writing-profile/regenerate
   * Regenerate AI summary
   */
  async regenerateWritingProfileSummary(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const result = await autoScriptsService.regenerateWritingProfileSummary(
        userId
      );

      return res.json(result);
    } catch (error: any) {
      if (error instanceof NoApiKeyConfiguredError) {
        return res.status(400).json({
          message: error.message,
        });
      }

      logger.error("Error regenerating summary", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to regenerate summary" });
    }
  },

  /**
   * GET /api/auto-scripts/feedback-history
   * Get user's feedback history
   */
  async getFeedbackHistory(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { limit } = FeedbackHistoryQueryDto.parse(req.query);
      const limitNum = limit ? parseInt(limit) : 50;

      const entries = await autoScriptsService.getFeedbackHistory(
        userId,
        limitNum
      );

      return res.json({ entries });
    } catch (error: any) {
      logger.error("Error fetching feedback history", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch feedback history" });
    }
  },

  /**
   * GET /api/auto-scripts/pending/count
   * Get pending scripts count
   */
  async getPendingCount(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const result = await autoScriptsService.getPendingCount(userId);

      return res.json(result);
    } catch (error: any) {
      logger.error("Error counting pending scripts", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to count pending scripts" });
    }
  },

  /**
   * GET /api/auto-scripts
   * Get all scripts for current user
   */
  async getScripts(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { status } = GetScriptsQueryDto.parse(req.query);

      const scripts = await autoScriptsService.getScripts(userId, status);

      return res.json(scripts);
    } catch (error: any) {
      logger.error("Error fetching auto scripts", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch scripts" });
    }
  },

  /**
   * GET /api/auto-scripts/:id
   * Get specific script
   */
  async getScriptById(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);

      const script = await autoScriptsService.getScriptById(id, userId);

      return res.json(script);
    } catch (error: any) {
      if (error instanceof AutoScriptNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AutoScriptAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      logger.error("Error fetching auto script", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch script" });
    }
  },

  /**
   * POST /api/auto-scripts/:id/approve
   * Approve script and create project
   */
  async approveScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);

      const result = await autoScriptsService.approveScript(id, userId);

      return res.json(result);
    } catch (error: any) {
      if (error instanceof AutoScriptNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AutoScriptAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof InvalidScriptStatusError) {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error approving auto script", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to approve script" });
    }
  },

  /**
   * POST /api/auto-scripts/:id/reject
   * Reject script
   */
  async rejectScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);
      const { reason, category } = RejectScriptDto.parse(req.body);

      const result = await autoScriptsService.rejectScript(
        id,
        userId,
        reason,
        category
      );

      return res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid rejection data",
          errors: error.errors,
        });
      }

      if (error instanceof AutoScriptNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AutoScriptAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof InvalidScriptStatusError) {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error rejecting auto script", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to reject script" });
    }
  },

  /**
   * GET /api/auto-scripts/:id/versions
   * Get version history
   */
  async getScriptVersions(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);

      const result = await autoScriptsService.getScriptVersions(id, userId);

      return res.json(result);
    } catch (error: any) {
      if (error instanceof AutoScriptNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AutoScriptAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      logger.error("Error fetching script versions", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch versions" });
    }
  },

  /**
   * POST /api/auto-scripts/:id/revise
   * Request revision
   */
  async reviseScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);

      // Debug: log incoming request body
      logger.info("Revision request received", {
        scriptId: id,
        userId,
        body: req.body,
        bodyType: typeof req.body,
      });

      let feedbackText: string;
      let selectedSceneIds: number[] | undefined;

      try {
        const parsed = ReviseScriptDto.parse(req.body);
        feedbackText = parsed.feedbackText;
        selectedSceneIds = parsed.selectedSceneIds;
      } catch (validationError: any) {
        logger.error("Revision validation error", {
          scriptId: id,
          userId,
          error: validationError.errors || validationError.message,
          body: req.body,
        });
        throw validationError;
      }

      const result = await autoScriptsService.reviseScript(
        id,
        userId,
        feedbackText,
        selectedSceneIds
      );

      return res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        logger.error("Zod validation error in revise", {
          errors: error.errors,
          body: req.body,
        });
        return res.status(400).json({
          message: "Invalid revision data",
          errors: error.errors,
        });
      }

      if (error instanceof AutoScriptNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AutoScriptAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof InvalidScriptStatusError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof MaxRevisionsReachedError) {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error requesting revision", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to request revision" });
    }
  },

  /**
   * POST /api/auto-scripts/:id/reset-revision
   * Reset a stuck revision
   */
  async resetRevision(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);

      const result = await autoScriptsService.resetRevision(id, userId);

      return res.json(result);
    } catch (error: any) {
      if (error instanceof AutoScriptNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AutoScriptAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof RevisionNotStuckError) {
        return res.status(400).json({ message: error.message });
      }

      logger.error("Error resetting revision", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to reset revision" });
    }
  },

  /**
   * PATCH /api/auto-scripts/:id
   * Update script content (for manual edits)
   */
  async updateScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ScriptIdParamDto.parse(req.params);
      const updates = req.body;

      const updatedScript = await autoScriptsService.updateScript(
        id,
        userId,
        updates
      );

      return res.json({ data: updatedScript });
    } catch (error: any) {
      if (error instanceof AutoScriptNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AutoScriptAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      logger.error("Error updating script", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to update script" });
    }
  },
};
