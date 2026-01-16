/**
 * Conveyor Settings Routes
 * Manages user's auto-content factory settings
 */
import type { Express } from "express";
import { z } from "zod";
import { conveyorSettingsStorage } from "../storage/conveyor-settings.storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { logger } from "../lib/logger";

// Validation schema for settings update
const updateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  sourceTypes: z.array(z.enum(["news", "instagram"])).optional(),
  sourceIds: z.array(z.string()).optional().nullable(),
  keywords: z.array(z.string()).optional().nullable(),
  excludeKeywords: z.array(z.string()).optional().nullable(),
  maxAgeDays: z.number().int().min(1).max(30).optional(),
  minScoreThreshold: z.number().int().min(50).max(95).optional(),
  dailyLimit: z.number().int().min(1).max(50).optional(),
  monthlyBudgetLimit: z.string().optional(), // decimal as string
});

export function registerConveyorSettingsRoutes(app: Express) {
  // GET /api/conveyor/settings - Get current settings
  app.get("/api/conveyor/settings", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      let settings = await conveyorSettingsStorage.getSettings(userId);

      // Create default settings if none exist
      if (!settings) {
        settings = await conveyorSettingsStorage.createSettings(userId);
      }

      // Check if daily counter needs to be reset (new day)
      const wasReset = await conveyorSettingsStorage.checkAndResetDailyCount(userId);
      if (wasReset) {
        // Refetch settings after reset
        settings = await conveyorSettingsStorage.getSettings(userId);
      }

      res.json(settings);
    } catch (error: any) {
      logger.error("Error fetching conveyor settings", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // PUT /api/conveyor/settings - Update settings
  app.put("/api/conveyor/settings", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = updateSettingsSchema.parse(req.body);

      // Ensure settings exist
      let settings = await conveyorSettingsStorage.getSettings(userId);
      if (!settings) {
        settings = await conveyorSettingsStorage.createSettings(userId);
      }

      // Update settings
      const updated = await conveyorSettingsStorage.updateSettings(userId, validated as any);

      logger.info("Conveyor settings updated", {
        userId,
        enabled: validated.enabled,
      });

      res.json(updated);
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
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // GET /api/conveyor/stats - Get conveyor statistics
  app.get("/api/conveyor/stats", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Check if daily counter needs to be reset (new day)
      await conveyorSettingsStorage.checkAndResetDailyCount(userId);

      const settings = await conveyorSettingsStorage.getSettings(userId);

      if (!settings) {
        return res.json({
          totalProcessed: 0,
          totalPassed: 0,
          totalFailed: 0,
          totalApproved: 0,
          totalRejected: 0,
          approvalRate: null,
          itemsProcessedToday: 0,
          dailyLimit: 10,
          currentMonthCost: "0",
          monthlyBudgetLimit: "10.00",
        });
      }

      res.json({
        totalProcessed: settings.totalProcessed,
        totalPassed: settings.totalPassed,
        totalFailed: settings.totalFailed,
        totalApproved: settings.totalApproved,
        totalRejected: settings.totalRejected,
        approvalRate: settings.approvalRate,
        itemsProcessedToday: settings.itemsProcessedToday,
        dailyLimit: settings.dailyLimit,
        currentMonthCost: settings.currentMonthCost,
        monthlyBudgetLimit: settings.monthlyBudgetLimit,
        learnedThreshold: settings.learnedThreshold,
        avoidedTopics: settings.avoidedTopics,
        preferredFormats: settings.preferredFormats,
      });
    } catch (error: any) {
      logger.error("Error fetching conveyor stats", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // POST /api/conveyor/settings/reset-learning - Reset learned patterns
  app.post("/api/conveyor/settings/reset-learning", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      await conveyorSettingsStorage.updateSettings(userId, {
        learnedThreshold: null,
        rejectionPatterns: {},
        avoidedTopics: [],
        preferredFormats: [],
      } as any);

      logger.info("Conveyor learning data reset", { userId });

      res.json({ success: true, message: "Learning data has been reset" });
    } catch (error: any) {
      logger.error("Error resetting learning data", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to reset learning data" });
    }
  });
}
