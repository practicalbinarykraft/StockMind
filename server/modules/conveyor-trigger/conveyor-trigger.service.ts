import { ConveyorTriggerRepo } from "./conveyor-trigger.repo";
import { logger } from "../../lib/logger";
import {
  triggerConveyorForUser,
  processSpecificItem,
} from "../../cron/conveyor-runner";
import { conveyorOrchestrator } from "../../conveyor/conveyor-orchestrator";
import { apiKeysService } from "../api-keys/api-keys.service";
import {
  ConveyorItemNotFoundError,
  ConveyorItemAccessDeniedError,
  ItemNotFailedError,
  MaxRetryLimitReachedError,
  SourceDataNotFoundError,
} from "./conveyor-trigger.errors";

const repo = new ConveyorTriggerRepo();
const MAX_RETRY_LIMIT = 3;

/**
 * Conveyor Trigger Service
 * Business logic for manual conveyor triggering
 */
export const conveyorTriggerService = {
  /**
   * Manually trigger conveyor run
   */
  async triggerConveyor(userId: string) {
    // Auto-enable conveyor if not enabled
    let settings = await repo.getSettings(userId);
    if (!settings?.enabled) {
      // Enable conveyor automatically when user clicks "Запустить"
      await repo.updateSettings(userId, { enabled: true });
      settings = await repo.getSettings(userId);
      logger.info("Conveyor auto-enabled via trigger", { userId });
    }

    // Check API key using apiKeysService
    const apiKeyRecord = await apiKeysService.getUserApiKey(userId, "anthropic");
    if (!apiKeyRecord) {
      // Throwing the domain error from api-keys module
      throw new Error("No Anthropic API key configured");
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

    return {
      success: true,
      message: "Conveyor triggered. Processing will run in background.",
    };
  },

  /**
   * Process specific item
   */
  async processItem(
    userId: string,
    sourceType: "news" | "instagram",
    sourceItemId: string
  ) {
    logger.info("Processing specific item", {
      userId,
      sourceType,
      sourceItemId,
    });

    const result = await processSpecificItem(userId, sourceType, sourceItemId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      itemId: result.itemId,
      scriptId: result.scriptId,
      message: "Item processed successfully",
    };
  },

  /**
   * Retry failed item
   */
  async retryItem(itemId: string, userId: string) {
    // Get item
    const item = await repo.getItemById(itemId);
    if (!item) {
      throw new ConveyorItemNotFoundError();
    }

    if (item.userId !== userId) {
      throw new ConveyorItemAccessDeniedError();
    }

    if (item.status !== "failed") {
      throw new ItemNotFailedError(item.status);
    }

    // Check retry limit
    if (item.retryCount >= MAX_RETRY_LIMIT) {
      throw new MaxRetryLimitReachedError(MAX_RETRY_LIMIT);
    }

    // Get API key using apiKeysService
    const apiKeyRecord = await apiKeysService.getUserApiKey(userId, "anthropic");
    if (!apiKeyRecord) {
      throw new Error("No Anthropic API key configured");
    }

    // Increment retry count and reset status
    await repo.incrementRetry(itemId);

    // Get source data and re-process
    const sourceData = item.sourceData as any;
    if (!sourceData) {
      throw new SourceDataNotFoundError();
    }

    logger.info("Retrying failed item", {
      userId,
      itemId,
      attempt: item.retryCount + 1,
    });

    // Process async
    conveyorOrchestrator
      .processItem(userId, sourceData, apiKeyRecord.decryptedKey)
      .then((result) => {
        logger.info("Retry completed", { userId, itemId, result });
      })
      .catch((error) => {
        logger.error("Retry failed", {
          userId,
          itemId,
          error: error.message,
        });
      });

    return {
      success: true,
      message: "Retry started",
      retryCount: item.retryCount + 1,
    };
  },

  /**
   * Delete/cancel item
   */
  async deleteItem(itemId: string, userId: string) {
    const item = await repo.getItemById(itemId);
    if (!item) {
      throw new ConveyorItemNotFoundError();
    }

    if (item.userId !== userId) {
      throw new ConveyorItemAccessDeniedError();
    }

    // Mark as cancelled
    await repo.updateItem(itemId, {
      status: "cancelled",
      completedAt: new Date(),
    });

    logger.info("Conveyor item cancelled", { userId, itemId });

    return {
      success: true,
      message: "Item cancelled",
    };
  },
};
