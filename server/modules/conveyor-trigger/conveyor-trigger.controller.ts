import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { conveyorTriggerService } from "./conveyor-trigger.service";
import { ProcessItemDto, ItemIdParamDto } from "./conveyor-trigger.dto";
import {
  ConveyorItemNotFoundError,
  ConveyorItemAccessDeniedError,
  ItemNotFailedError,
  MaxRetryLimitReachedError,
  SourceDataNotFoundError,
} from "./conveyor-trigger.errors";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";
import { z } from "zod";

/**
 * Controller for Conveyor Trigger
 * Handles req/res, validation, HTTP status codes
 */
export const conveyorTriggerController = {
  /**
   * POST /api/conveyor/trigger
   * Manually trigger conveyor run
   */
  async triggerConveyor(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const result = await conveyorTriggerService.triggerConveyor(userId);

      return res.json(result);
    } catch (error: any) {
      if (error instanceof ApiKeyNotFoundError || error.message?.includes("API key")) {
        return res.status(400).json({ 
          message: "No Anthropic API key configured" 
        });
      }

      logger.error("Error triggering conveyor", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to trigger conveyor" });
    }
  },

  /**
   * POST /api/conveyor/process-item
   * Process specific item
   */
  async processItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { sourceType, sourceItemId } = ProcessItemDto.parse(req.body);

      const result = await conveyorTriggerService.processItem(
        userId,
        sourceType,
        sourceItemId
      );

      if (result.success) {
        return res.json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request",
          errors: error.errors,
        });
      }

      logger.error("Error processing item", {
        userId: getUserId(req),
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to process item" });
    }
  },

  /**
   * POST /api/conveyor/items/:id/retry
   * Retry failed item
   */
  async retryItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ItemIdParamDto.parse(req.params);

      const result = await conveyorTriggerService.retryItem(id, userId);

      return res.json(result);
    } catch (error: any) {
      if (error instanceof ConveyorItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ConveyorItemAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof ItemNotFailedError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof MaxRetryLimitReachedError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof SourceDataNotFoundError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof ApiKeyNotFoundError || error.message?.includes("API key")) {
        return res.status(400).json({ 
          message: "No Anthropic API key configured" 
        });
      }

      logger.error("Error retrying item", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to retry item" });
    }
  },

  /**
   * DELETE /api/conveyor/items/:id
   * Delete/cancel item
   */
  async deleteItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ItemIdParamDto.parse(req.params);

      const result = await conveyorTriggerService.deleteItem(id, userId);

      return res.json(result);
    } catch (error: any) {
      if (error instanceof ConveyorItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ConveyorItemAccessDeniedError) {
        return res.status(403).json({ message: error.message });
      }

      logger.error("Error cancelling item", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      return res.status(500).json({ message: "Failed to cancel item" });
    }
  },
};
