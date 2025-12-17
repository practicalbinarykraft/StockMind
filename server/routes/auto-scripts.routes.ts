/**
 * Auto Scripts Routes
 * Handles generated scripts pending user review
 */
import type { Express } from "express";
import { z } from "zod";
import { autoScriptsStorage } from "../storage/auto-scripts.storage";
import { conveyorItemsStorage } from "../storage/conveyor-items.storage";
import {
  userWritingProfileStorage,
  userFeedbackEntriesStorage,
  autoScriptVersionsStorage,
} from "../storage/user-writing-profile.storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { logger } from "../lib/logger";
import { learningService } from "../conveyor/learning-service";
import { conveyorOrchestrator } from "../conveyor/conveyor-orchestrator";
import { createFeedbackProcessor } from "../conveyor/feedback-processor";
import { revisionProcessor } from "../conveyor/revision-processor";
import { storage } from "../storage";
import { scriptsLibraryStorage } from "../storage/scripts-library.storage";
import { RejectionCategory, type WritingRule } from "@shared/schema";
import { decryptApiKey } from "../storage/base/encryption";

const MAX_REVISIONS = 5;

// Validation schemas
const rejectSchema = z.object({
  reason: z.string().min(1).max(500),
  category: z.enum([
    RejectionCategory.TOO_LONG,
    RejectionCategory.TOO_SHORT,
    RejectionCategory.BORING_INTRO,
    RejectionCategory.WEAK_CTA,
    RejectionCategory.TOO_FORMAL,
    RejectionCategory.TOO_CASUAL,
    RejectionCategory.BORING_TOPIC,
    RejectionCategory.WRONG_TONE,
    RejectionCategory.NO_HOOK,
    RejectionCategory.TOO_COMPLEX,
    RejectionCategory.OFF_TOPIC,
    RejectionCategory.OTHER,
  ]),
});

const reviseSchema = z.object({
  feedbackText: z.string().trim().min(1, "Введите текст рецензии").max(3000, "Текст слишком длинный (макс. 3000 символов)"),
  selectedSceneIds: z.union([
    z.array(z.number()),
    z.null(),
  ]).optional().transform((val) => {
    // Convert null to undefined, keep array as is
    if (val === null || val === undefined) return undefined;
    return val;
  }),
});

export function registerAutoScriptsRoutes(app: Express) {
  // ============================================================================
  // STATIC ROUTES (must be defined BEFORE parameterized routes like :id)
  // ============================================================================

  // GET /api/auto-scripts/rejection-categories - Get available categories
  app.get("/api/auto-scripts/rejection-categories", requireAuth, async (req: any, res) => {
    res.json({
      categories: [
        { id: RejectionCategory.TOO_LONG, label: "Слишком длинный", emoji: "⏱️" },
        { id: RejectionCategory.TOO_SHORT, label: "Слишком короткий", emoji: "📏" },
        { id: RejectionCategory.BORING_INTRO, label: "Скучное начало", emoji: "😴" },
        { id: RejectionCategory.WEAK_CTA, label: "Слабый призыв к действию", emoji: "👆" },
        { id: RejectionCategory.TOO_FORMAL, label: "Слишком формальный", emoji: "🎩" },
        { id: RejectionCategory.TOO_CASUAL, label: "Слишком разговорный", emoji: "💬" },
        { id: RejectionCategory.BORING_TOPIC, label: "Скучная тема", emoji: "🥱" },
        { id: RejectionCategory.WRONG_TONE, label: "Неправильный тон", emoji: "🎭" },
        { id: RejectionCategory.NO_HOOK, label: "Нет хука", emoji: "🎣" },
        { id: RejectionCategory.TOO_COMPLEX, label: "Слишком сложный", emoji: "🧩" },
        { id: RejectionCategory.OFF_TOPIC, label: "Не по теме", emoji: "🎯" },
        { id: RejectionCategory.OTHER, label: "Другое", emoji: "📝" },
      ],
    });
  });

  // GET /api/auto-scripts/writing-profile - Get user's writing profile and AI summary
  app.get("/api/auto-scripts/writing-profile", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const profile = await userWritingProfileStorage.getByUserId(userId);

      if (!profile) {
        return res.json({
          hasProfile: false,
          aiSummary: null,
          avoidPatterns: [],
          preferPatterns: [],
          writingRules: [],
          totalFeedbackCount: 0,
        });
      }

      res.json({
        hasProfile: true,
        aiSummary: profile.aiSummary,
        avoidPatterns: profile.avoidPatterns || [],
        preferPatterns: profile.preferPatterns || [],
        writingRules: profile.writingRules || [],
        tonePreference: profile.tonePreference,
        styleNotes: profile.styleNotes,
        totalFeedbackCount: profile.totalFeedbackCount,
        lastFeedbackAt: profile.lastFeedbackAt,
        updatedAt: profile.updatedAt,
      });
    } catch (error: any) {
      logger.error("Error fetching writing profile", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch writing profile" });
    }
  });

  // POST /api/auto-scripts/writing-profile/regenerate - Regenerate AI summary
  app.post("/api/auto-scripts/writing-profile/regenerate", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get API key
      const apiKeyRecord = await storage.getUserApiKey(userId, "anthropic");
      if (!apiKeyRecord?.encryptedKey) {
        return res.status(400).json({
          message: "No Anthropic API key configured",
        });
      }

      const apiKey = decryptApiKey(apiKeyRecord.encryptedKey);
      const processor = createFeedbackProcessor(apiKey);

      // Process any unprocessed feedback first
      const processed = await processor.processUserFeedback(userId);

      // Regenerate summary
      const summary = await processor.regenerateSummary(userId);

      if (!summary) {
        return res.json({
          success: true,
          message: "Недостаточно данных для создания резюме",
          summary: null,
          processedCount: processed,
        });
      }

      res.json({
        success: true,
        message: "Резюме обновлено",
        summary,
        processedCount: processed,
      });
    } catch (error: any) {
      logger.error("Error regenerating summary", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to regenerate summary" });
    }
  });

  // GET /api/auto-scripts/feedback-history - Get user's feedback history
  app.get("/api/auto-scripts/feedback-history", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const limit = parseInt(req.query.limit as string) || 50;
      const entries = await userFeedbackEntriesStorage.getByUser(userId, limit);

      res.json({
        entries: entries.map((e) => ({
          id: e.id,
          feedbackType: e.feedbackType,
          feedbackText: e.feedbackText,
          extractedPatterns: e.extractedPatterns,
          processedAt: e.processedAt,
          appliedToProfile: e.appliedToProfile,
          createdAt: e.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("Error fetching feedback history", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch feedback history" });
    }
  });

  // GET /api/auto-scripts/pending/count - Get pending scripts count
  app.get("/api/auto-scripts/pending/count", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const count = await autoScriptsStorage.countPending(userId);
      res.json({ count });
    } catch (error: any) {
      logger.error("Error counting pending scripts", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to count pending scripts" });
    }
  });

  // ============================================================================
  // PARAMETERIZED ROUTES (must come AFTER static routes)
  // ============================================================================

  // GET /api/auto-scripts - Get all scripts for current user
  app.get("/api/auto-scripts", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { status } = req.query;

      // When requesting "pending" scripts, include both "pending" and "revision"
      // so scripts being revised don't disappear from the review UI
      let scripts;
      if (status === 'pending') {
        scripts = await autoScriptsStorage.getForReview(userId);
      } else {
        scripts = await autoScriptsStorage.getByUser(
          userId,
          status as string | undefined
        );
      }

      res.json(scripts);
    } catch (error: any) {
      logger.error("Error fetching auto scripts", {
        userId: getUserId(req),
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch scripts" });
    }
  });

  // GET /api/auto-scripts/:id - Get specific script
  app.get("/api/auto-scripts/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const script = await autoScriptsStorage.getById(id);

      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }

      if (script.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get conveyor item for additional context
      const conveyorItem = await conveyorItemsStorage.getById(script.conveyorItemId);

      res.json({
        ...script,
        sourceData: conveyorItem?.sourceData,
        scoringData: conveyorItem?.scoringData,
        analysisData: conveyorItem?.analysisData,
        architectureData: conveyorItem?.architectureData,
      });
    } catch (error: any) {
      logger.error("Error fetching auto script", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch script" });
    }
  });

  // POST /api/auto-scripts/:id/approve - Approve script and create project
  app.post("/api/auto-scripts/:id/approve", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const script = await autoScriptsStorage.getById(id);

      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }

      if (script.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (script.status !== "pending") {
        return res.status(400).json({
          message: `Script is already ${script.status}`,
        });
      }

      // Create script in scripts library
      // Cast to any for optional fields that may not be in the strict type
      const scriptData = script as any;
      const libraryScript = await scriptsLibraryStorage.createScript(userId, {
        title: script.title,
        status: 'ready',
        scenes: script.scenes || [],
        fullText: script.fullScript,
        format: script.formatId || undefined,
        durationSeconds: scriptData.durationSeconds || undefined,
        wordCount: script.fullScript ? script.fullScript.split(/\s+/).length : undefined,
        aiScore: script.finalScore || undefined,
        aiAnalysis: scriptData.scoring || undefined,
        sourceType: script.sourceType,
        sourceId: scriptData.sourceContentId || script.sourceItemId || undefined,
        sourceTitle: scriptData.sourceTitle || undefined,
        sourceUrl: scriptData.sourceUrl || undefined,
      });

      // Mark script as approved in auto_scripts table
      await autoScriptsStorage.approve(id);

      // Update learning system
      await learningService.onApprove(userId, id);

      logger.info("Auto script approved", {
        userId,
        scriptId: id,
        libraryScriptId: libraryScript.id,
      });

      res.json({
        success: true,
        scriptId: libraryScript.id,
        message: "Script approved and added to library",
      });
    } catch (error: any) {
      logger.error("Error approving auto script", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to approve script" });
    }
  });

  // POST /api/auto-scripts/:id/reject - Reject script
  app.post("/api/auto-scripts/:id/reject", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const { reason, category } = rejectSchema.parse(req.body);

      const script = await autoScriptsStorage.getById(id);

      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }

      if (script.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (script.status !== "pending") {
        return res.status(400).json({
          message: `Script is already ${script.status}`,
        });
      }

      // Reject script
      await autoScriptsStorage.reject(id, reason, category);

      // Update learning system
      await learningService.onReject(userId, id, reason, category);

      logger.info("Auto script rejected", {
        userId,
        scriptId: id,
        category,
      });

      res.json({
        success: true,
        message: "Script rejected",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid rejection data",
          errors: error.errors,
        });
      }

      logger.error("Error rejecting auto script", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to reject script" });
    }
  });

  // GET /api/auto-scripts/:id/versions - Get version history
  app.get("/api/auto-scripts/:id/versions", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const script = await autoScriptsStorage.getById(id);

      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }

      if (script.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get real versions from storage
      const versions = await autoScriptVersionsStorage.getByScriptId(id);

      res.json({
        versions: versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          title: v.title,
          scenes: v.scenes,
          fullScript: v.fullScript,
          finalScore: v.finalScore,
          hookScore: v.hookScore,
          structureScore: v.structureScore,
          emotionalScore: v.emotionalScore,
          ctaScore: v.ctaScore,
          feedbackText: v.feedbackText,
          feedbackSceneIds: v.feedbackSceneIds,
          isCurrent: v.isCurrent,
          createdAt: v.createdAt,
        })),
        currentVersion: script.revisionCount + 1,
      });
    } catch (error: any) {
      logger.error("Error fetching script versions", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  // POST /api/auto-scripts/:id/revise - Request revision
  app.post("/api/auto-scripts/:id/revise", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

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
        const parsed = reviseSchema.parse(req.body);
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

      const script = await autoScriptsStorage.getById(id);

      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }

      if (script.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Allow revision for scripts in "pending" or "revision" status
      // (revision status means a previous revision request is in progress or failed)
      if (script.status !== "pending" && script.status !== "revision") {
        return res.status(400).json({
          message: `Script is already ${script.status}`,
        });
      }

      // Check revision limit
      if (script.revisionCount >= MAX_REVISIONS) {
        // Auto-reject after max revisions
        await autoScriptsStorage.reject(
          id,
          "Maximum revision limit reached",
          RejectionCategory.OTHER
        );

        return res.status(400).json({
          message: `Maximum revision limit (${MAX_REVISIONS}) reached. Script has been rejected.`,
        });
      }

      // Mark for revision with enhanced feedback
      await autoScriptsStorage.markRevision(id, feedbackText);

      // Update learning system with enhanced feedback
      try {
        await learningService.onRevise(userId, id, feedbackText);
      } catch (learningError: any) {
        logger.error("Error in learning service onRevise", {
          userId,
          scriptId: id,
          error: learningError.message,
          stack: learningError.stack,
        });
        // Don't fail the request if learning service fails
      }

      // Get user's API key for conveyor processing
      let apiKey: string | null = null;
      try {
        const apiKeyRecord = await storage.getUserApiKey(userId, "anthropic");
        if (apiKeyRecord?.encryptedKey) {
          apiKey = decryptApiKey(apiKeyRecord.encryptedKey);
        }
      } catch (keyError: any) {
        logger.warn("Failed to get API key for revision", { userId, error: keyError.message });
      }

      // Create revision conveyor item and start processing
      if (apiKey) {
        try {
          // Create revision item (copies stage data from parent, sets revisionContext)
          const revisionResult = await revisionProcessor.createRevisionItem(
            script,
            feedbackText,
            selectedSceneIds
          );

          if (revisionResult.success && revisionResult.conveyorItemId) {
            try {
              await autoScriptsStorage.update(script.id, {
                conveyorItemId: revisionResult.conveyorItemId,
              });
              script.conveyorItemId = revisionResult.conveyorItemId;
            } catch (updateError: any) {
              logger.warn("Failed to reassign conveyor item to auto script", {
                scriptId: script.id,
                revisionItemId: revisionResult.conveyorItemId,
                error: updateError.message,
              });
            }

            // Start processing asynchronously (don't await)
            conveyorOrchestrator.processRevisionItem(
              revisionResult.conveyorItemId,
              apiKey
            ).then((result) => {
              logger.info("Revision processing completed", {
                userId,
                scriptId: id,
                conveyorItemId: revisionResult.conveyorItemId,
                success: result.success,
              });
            }).catch((err) => {
              logger.error("Revision processing failed", {
                userId,
                scriptId: id,
                conveyorItemId: revisionResult.conveyorItemId,
                error: err.message,
              });
            });

            logger.info("Auto script revision started", {
              userId,
              scriptId: id,
              conveyorItemId: revisionResult.conveyorItemId,
              revisionCount: script.revisionCount + 1,
              selectedSceneIds: selectedSceneIds || [],
            });
          } else {
            logger.warn("Failed to create revision item", {
              userId,
              scriptId: id,
              error: revisionResult.error,
            });
          }
        } catch (revisionError: any) {
          logger.error("Error creating revision item", {
            userId,
            scriptId: id,
            error: revisionError.message,
          });
          // Don't fail the request - revision is already marked
        }
      } else {
        logger.warn("No API key available for revision processing", { userId, scriptId: id });
      }

      res.json({
        success: true,
        message: "Revision requested",
        revisionCount: script.revisionCount + 1,
      });
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

      logger.error("Error requesting revision", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to request revision" });
    }
  });

  // POST /api/auto-scripts/:id/reset-revision - Reset a stuck revision
  app.post("/api/auto-scripts/:id/reset-revision", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const script = await autoScriptsStorage.getById(id);

      if (!script) {
        return res.status(404).json({ message: "Script not found" });
      }

      if (script.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only allow reset for scripts that are stuck in revision status
      // or have reached the revision limit
      if (script.status !== "revision" && script.revisionCount < MAX_REVISIONS) {
        return res.status(400).json({
          message: "Script is not stuck in revision",
        });
      }

      // Reset the revision state
      const updatedScript = await autoScriptsStorage.resetRevision(id);

      logger.info("Revision reset", {
        userId,
        scriptId: id,
        previousStatus: script.status,
        previousRevisionCount: script.revisionCount,
      });

      res.json({
        success: true,
        message: "Revision reset successfully",
        script: updatedScript,
      });
    } catch (error: any) {
      logger.error("Error resetting revision", {
        userId: getUserId(req),
        scriptId: req.params.id,
        error: error.message,
      });
      res.status(500).json({ message: "Failed to reset revision" });
    }
  });
}
