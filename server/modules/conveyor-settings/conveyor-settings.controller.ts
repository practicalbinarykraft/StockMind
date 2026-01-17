import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { conveyorSettingsService } from "./conveyor-settings.service";
import { UpdateSettingsDto } from "./conveyor-settings.dto";
import { z } from "zod";

/**
 * Controller for Conveyor Settings
 * Handles req/res, validation, HTTP status codes
 */
export const conveyorSettingsController = {
  /**
   * GET /api/conveyor/settings
   * Get current settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const settings = await conveyorSettingsService.getSettings(userId);

      return res.json(settings);
    } catch (error: any) {
      logger.error("Error fetching conveyor settings", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch settings" });
    }
  },

  /**
   * PUT /api/conveyor/settings
   * Update settings
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const validated = UpdateSettingsDto.parse(req.body);

      const updated = await conveyorSettingsService.updateSettings(
        userId,
        validated
      );

      return res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid settings",
          errors: error.errors,
        });
      }

      logger.error("Error updating conveyor settings", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to update settings" });
    }
  },

  /**
   * GET /api/conveyor/stats
   * Get conveyor statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const stats = await conveyorSettingsService.getStats(userId);

      return res.json(stats);
    } catch (error: any) {
      logger.error("Error fetching conveyor stats", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  },

  /**
   * POST /api/conveyor/settings/reset-learning
   * Reset learned patterns
   */
  async resetLearning(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const result = await conveyorSettingsService.resetLearning(userId);

      return res.json(result);
    } catch (error: any) {
      logger.error("Error resetting learning data", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to reset learning data" });
    }
  },
};
