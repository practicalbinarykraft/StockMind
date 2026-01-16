import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { conveyorProgressService } from "./conveyor-progress.service";
import { ItemIdParamDto } from "./conveyor-progress.dto";
import {
  ConveyorItemNotFoundError,
  ConveyorItemAccessDeniedError,
} from "./conveyor-progress.errors";

/**
 * Controller for Conveyor Progress
 * Handles req/res, validation, HTTP status codes
 */
export const conveyorProgressController = {
  /**
   * GET /api/conveyor/items/:id/progress
   * Get progress information for a conveyor item
   */
  async getItemProgress(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ItemIdParamDto.parse(req.params);

      const data = await conveyorProgressService.getItemProgress(id, userId);

      return res.json({ success: true, data });
    } catch (error: any) {
      if (error instanceof ConveyorItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ConveyorItemAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      logger.error("Error fetching conveyor progress", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch progress" });
    }
  },

  /**
   * GET /api/conveyor/items/:id/logs
   * Get logs for a conveyor item
   */
  async getItemLogs(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ItemIdParamDto.parse(req.params);

      const data = await conveyorProgressService.getItemLogs(id, userId);

      return res.json({ success: true, data });
    } catch (error: any) {
      if (error instanceof ConveyorItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ConveyorItemAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      logger.error("Error fetching conveyor logs", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch logs" });
    }
  },
};
