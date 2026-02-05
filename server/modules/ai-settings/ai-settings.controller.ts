import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { aiSettingsService } from "./ai-settings.service";

/**
 * Controller for AI Settings
 * Handles settings for AI script generation
 */
export const aiSettingsController = {
  /**
   * GET /api/ai-settings
   * Get AI generation settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const settings = await aiSettingsService.getSettings(userId);

      return res.json({ data: settings });
    } catch (error: any) {
      logger.error("Error fetching AI settings", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  },

  /**
   * PUT /api/ai-settings
   * Update AI generation settings
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const updated = await aiSettingsService.updateSettings(userId, req.body);

      return res.json({ data: updated });
    } catch (error: any) {
      logger.error("Error updating AI settings", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to update AI settings" });
    }
  },
};
