/**
 * Conveyor Trigger Routes
 * Manual trigger endpoints for the conveyor pipeline
 */
import type { Express } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { logger } from "../lib/logger";
import {
  triggerConveyorForUser,
  processSpecificItem,
} from "../cron/conveyor-runner";
import { conveyorItemsStorage } from "../storage/conveyor-items.storage";
import { conveyorSettingsStorage } from "../storage/conveyor-settings.storage";
import { conveyorOrchestrator } from "../conveyor/conveyor-orchestrator";
import { storage } from "../storage";

// Validation schemas
const processItemSchema = z.object({
  sourceType: z.enum(["news", "instagram"]),
  sourceItemId: z.string().min(1),
});

export function registerConveyorTriggerRoutes(app: Express) {
  // POST /api/conveyor/trigger - Manually trigger conveyor run
  app.post("/api/conveyor/trigger", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Auto-enable conveyor if not enabled
      let settings = await conveyorSettingsStorage.getSettings(userId);
      if (!settings?.enabled) {
        // Enable conveyor automatically when user clicks "Запустить"
        await conveyorSettingsStorage.updateSettings(userId, { enabled: true });
        settings = await conveyorSettingsStorage.getSettings(userId);
        logger.info("Conveyor auto-enabled via trigger", { userId });
      }

      // Check API key
      const apiKeyRecord = await storage.getUserApiKey(userId, "anthropic");
      if (!apiKeyRecord) {
        return res.status(400).json({
          message: "No Anthropic API key configured",
        });
      }

      logger.info("Manual conveyor trigger requested", { userId });

      // Trigger conveyor (async, don't wait)
      triggerConveyorForUser(userId)
        .then((result) => {
          logger.info("Manual conveyor trigger completed", { userId, result });
        })
        .catch((error) => {
          logger.error("Manual conveyor trigger failed", {
            userId,
            error: error.message,
          });
        });

      res.json({
        success: true,
        message: "Conveyor triggered. Processing will run in background.",
      });
    } catch (error: any) {
      logger.error("Error triggering conveyor", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to trigger conveyor" });
    }
  });

  // POST /api/conveyor/process-item - Process specific item /// antropic
  app.post("/api/conveyor/process-item", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { sourceType, sourceItemId } = processItemSchema.parse(req.body);

      logger.info("Processing specific item", {
        userId,
        sourceType,
        sourceItemId,
      });

      const result = await processSpecificItem(
        userId,
        sourceType,
        sourceItemId
      );

      if (result.success) {
        res.json({
          success: true,
          itemId: result.itemId,
          scriptId: result.scriptId,
          message: "Item processed successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
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
      res.status(500).json({ message: "Failed to process item" });
    }
  });

  // POST /api/conveyor/items/:id/retry - Retry failed item // antropic
  app.post(
    "/api/conveyor/items/:id/retry",
    requireAuth,
    async (req: any, res) => {
      try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;

        // Get item
        const item = await conveyorItemsStorage.getById(id);
        if (!item) {
          return res.status(404).json({ message: "Item not found" });
        }

        if (item.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }

        if (item.status !== "failed") {
          return res.status(400).json({
            message: `Item is not failed (status: ${item.status})`,
          });
        }

        // Check retry limit
        if (item.retryCount >= 3) {
          return res.status(400).json({
            message: "Maximum retry limit reached (3)",
          });
        }

        // Get API key
        const apiKeyRecord = await storage.getUserApiKey(userId, "anthropic");
        if (!apiKeyRecord) {
          return res.status(400).json({
            message: "No Anthropic API key configured",
          });
        }

        // Increment retry count and reset status
        await conveyorItemsStorage.incrementRetry(id);

        // Get source data and re-process
        const sourceData = item.sourceData as any;
        if (!sourceData) {
          return res.status(400).json({
            message: "Source data not found for retry",
          });
        }

        logger.info("Retrying failed item", {
          userId,
          itemId: id,
          attempt: item.retryCount + 1,
        });

        // Process async
        conveyorOrchestrator
          .processItem(userId, sourceData, apiKeyRecord.decryptedKey)
          .then((result) => {
            logger.info("Retry completed", { userId, itemId: id, result });
          })
          .catch((error) => {
            logger.error("Retry failed", {
              userId,
              itemId: id,
              error: error.message,
            });
          });

        res.json({
          success: true,
          message: "Retry started",
          retryCount: item.retryCount + 1,
        });
      } catch (error: any) {
        logger.error("Error retrying item", {
          userId: getUserId(req),
          itemId: req.params.id,
          error: error.message,
        });
        res.status(500).json({ message: "Failed to retry item" });
      }
    }
  );

  // DELETE /api/conveyor/items/:id - Delete/cancel item
  app.delete("/api/conveyor/items/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

      const item = await conveyorItemsStorage.getById(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (item.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Mark as cancelled
      await conveyorItemsStorage.update(id, {
        status: "cancelled",
        completedAt: new Date(),
      } as any);

      logger.info("Conveyor item cancelled", { userId, itemId: id });

      res.json({ success: true, message: "Item cancelled" });
    } catch (error: any) {
      logger.error("Error cancelling item", {
        userId: getUserId(req),
        itemId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to cancel item" });
    }
  });
}
