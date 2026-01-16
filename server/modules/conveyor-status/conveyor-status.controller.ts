import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { conveyorStatusService } from "./conveyor-status.service";
import { GetItemsQueryDto, ItemIdParamDto } from "./conveyor-status.dto";
import {
  ConveyorItemNotFoundError,
  ConveyorItemAccessDeniedError,
} from "./conveyor-status.errors";

/**
 * Controller for Conveyor Status
 * Handles req/res, validation, HTTP status codes
 */
export const conveyorStatusController = {
  /**
   * GET /api/conveyor/status
   * Get current conveyor status
   */
  async getStatus(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const status = await conveyorStatusService.getStatus(userId);

      return res.json(status);
    } catch (error: any) {
      logger.error("Error fetching conveyor status", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch status" });
    }
  },

  /**
   * GET /api/conveyor/items
   * Get processing history
   */
  async getItems(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { limit } = GetItemsQueryDto.parse(req.query);
      const items = await conveyorStatusService.getItems(userId, limit);

      return res.json(items);
    } catch (error: any) {
      logger.error("Error fetching conveyor items", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch items" });
    }
  },

  /**
   * GET /api/conveyor/items/:id
   * Get specific item details
   */
  async getItemById(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ItemIdParamDto.parse(req.params);
      const item = await conveyorStatusService.getItemById(id, userId);

      return res.json(item);
    } catch (error: any) {
      if (error instanceof ConveyorItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ConveyorItemAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      logger.error("Error fetching conveyor item", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch item" });
    }
  },

  /**
   * GET /api/conveyor/failed
   * Get failed items
   */
  async getFailedItems(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const items = await conveyorStatusService.getFailedItems(userId);

      return res.json(items);
    } catch (error: any) {
      logger.error("Error fetching failed items", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch failed items" });
    }
  },

  /**
   * GET /api/conveyor/logs
   * Get conveyor logs
   */
  async getLogs(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { limit } = GetItemsQueryDto.parse(req.query);
      const logs = await conveyorStatusService.getLogs(userId, limit);

      return res.json(logs);
    } catch (error: any) {
      logger.error("Error fetching conveyor logs", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch logs" });
    }
  },

  /**
   * GET /api/conveyor/dashboard
   * Get dashboard summary
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const dashboard = await conveyorStatusService.getDashboard(userId);

      return res.json(dashboard);
    } catch (error: any) {
      logger.error("Error fetching dashboard", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  },
};
