import { AutoScriptsRepo } from "./auto-scripts.repo";
import { logger } from "../../lib/logger";
import { scriptsLibraryService } from "../scripts-library/scripts-library.service";
import { apiKeysService } from "../api-keys/api-keys.service";
import { learningService } from "../../conveyor/learning-service";
import { conveyorOrchestrator } from "../../conveyor/conveyor-orchestrator";
import { createFeedbackProcessor } from "../../conveyor/feedback-processor";
import { revisionProcessor } from "../../conveyor/revision-processor";
import { RejectionCategory } from "@shared/schema";
import {
  AutoScriptNotFoundError,
  AutoScriptAccessDeniedError,
  InvalidScriptStatusError,
  MaxRevisionsReachedError,
  RevisionNotStuckError,
  NoApiKeyConfiguredError,
} from "./auto-scripts.errors";

const repo = new AutoScriptsRepo();
const MAX_REVISIONS = 5;

/**
 * Auto Scripts Service
 * Business logic for auto-generated scripts management
 */
export const autoScriptsService = {
  /**
   * Get rejection categories
   */
  getRejectionCategories() {
    return [
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
    ];
  },

  /**
   * Get writing profile for user
   */
  async getWritingProfile(userId: string) {
    const profile = await repo.getWritingProfile(userId);

    if (!profile) {
      return {
        hasProfile: false,
        aiSummary: null,
        avoidPatterns: [],
        preferPatterns: [],
        writingRules: [],
        totalFeedbackCount: 0,
      };
    }

    return {
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
    };
  },

  /**
   * Regenerate AI summary for writing profile
   */
  async regenerateWritingProfileSummary(userId: string) {
    // Get API key
    const apiKeyRecord = await apiKeysService.getUserApiKey(userId, "anthropic");
    if (!apiKeyRecord?.decryptedKey) {
      throw new NoApiKeyConfiguredError();
    }

    const apiKey = apiKeyRecord.decryptedKey;
    const processor = createFeedbackProcessor(apiKey);

    // Process any unprocessed feedback first
    const processed = await processor.processUserFeedback(userId);

    // Regenerate summary
    const summary = await processor.regenerateSummary(userId);

    if (!summary) {
      return {
        success: true,
        message: "Недостаточно данных для создания резюме",
        summary: null,
        processedCount: processed,
      };
    }

    return {
      success: true,
      message: "Резюме обновлено",
      summary,
      processedCount: processed,
    };
  },

  /**
   * Get feedback history
   */
  async getFeedbackHistory(userId: string, limit = 50) {
    const entries = await repo.getFeedbackHistory(userId, limit);

    return entries.map((e) => ({
      id: e.id,
      feedbackType: e.feedbackType,
      feedbackText: e.feedbackText,
      extractedPatterns: e.extractedPatterns,
      processedAt: e.processedAt,
      appliedToProfile: e.appliedToProfile,
      createdAt: e.createdAt,
    }));
  },

  /**
   * Get pending scripts count
   */
  async getPendingCount(userId: string) {
    const count = await repo.countPending(userId);
    return { count };
  },

  /**
   * Get scripts for user
   */
  async getScripts(userId: string, status?: string) {
    // When requesting "pending" scripts, include both "pending" and "revision"
    // so scripts being revised don't disappear from the review UI
    if (status === "pending") {
      return await repo.getForReview(userId);
    }

    return await repo.getByUser(userId, status);
  },

  /**
   * Get script by ID
   */
  async getScriptById(scriptId: string, userId: string) {
    const script = await repo.getById(scriptId);

    if (!script) {
      throw new AutoScriptNotFoundError();
    }

    if (script.userId !== userId) {
      throw new AutoScriptAccessDeniedError();
    }

    // Get conveyor item for additional context
    const conveyorItem = await repo.getConveyorItemById(script.conveyorItemId);

    return {
      ...script,
      sourceData: conveyorItem?.sourceData,
      scoringData: conveyorItem?.scoringData,
      analysisData: conveyorItem?.analysisData,
      architectureData: conveyorItem?.architectureData,
    };
  },

  /**
   * Approve script and create library script
   */
  async approveScript(scriptId: string, userId: string) {
    const script = await repo.getById(scriptId);

    if (!script) {
      throw new AutoScriptNotFoundError();
    }

    if (script.userId !== userId) {
      throw new AutoScriptAccessDeniedError();
    }

    if (script.status !== "pending") {
      throw new InvalidScriptStatusError(script.status);
    }

    // Create script in scripts library
    const scriptData = script as any;
    const libraryScript = await scriptsLibraryService.createScript(userId, {
      title: script.title,
      status: "ready",
      scenes: script.scenes || [],
      fullText: script.fullScript,
      format: script.formatId || undefined,
      durationSeconds: scriptData.durationSeconds || undefined,
      wordCount: script.fullScript
        ? script.fullScript.split(/\s+/).length
        : undefined,
      aiScore: script.finalScore || undefined,
      aiAnalysis: scriptData.scoring || undefined,
      sourceType: script.sourceType,
      sourceId: scriptData.sourceContentId || script.sourceItemId || undefined,
      sourceTitle: scriptData.sourceTitle || undefined,
      sourceUrl: scriptData.sourceUrl || undefined,
    });

    // Mark script as approved in auto_scripts table
    await repo.approve(scriptId);

    // Update learning system
    await learningService.onApprove(userId, scriptId);

    logger.info("Auto script approved", {
      userId,
      scriptId,
      libraryScriptId: libraryScript.id,
    });

    return {
      success: true,
      scriptId: libraryScript.id,
      message: "Script approved and added to library",
    };
  },

  /**
   * Reject script
   */
  async rejectScript(
    scriptId: string,
    userId: string,
    reason: string,
    category: string
  ) {
    const script = await repo.getById(scriptId);

    if (!script) {
      throw new AutoScriptNotFoundError();
    }

    if (script.userId !== userId) {
      throw new AutoScriptAccessDeniedError();
    }

    if (script.status !== "pending") {
      throw new InvalidScriptStatusError(script.status);
    }

    // Reject script
    await repo.reject(scriptId, reason, category);

    // Update learning system
    await learningService.onReject(userId, scriptId, reason, category);

    logger.info("Auto script rejected", {
      userId,
      scriptId,
      category,
    });

    return {
      success: true,
      message: "Script rejected",
    };
  },

  /**
   * Get script versions
   */
  async getScriptVersions(scriptId: string, userId: string) {
    const script = await repo.getById(scriptId);

    if (!script) {
      throw new AutoScriptNotFoundError();
    }

    if (script.userId !== userId) {
      throw new AutoScriptAccessDeniedError();
    }

    // Get real versions from storage
    const versions = await repo.getScriptVersions(scriptId);

    return {
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
    };
  },

  /**
   * Request revision
   */
  async reviseScript(
    scriptId: string,
    userId: string,
    feedbackText: string,
    selectedSceneIds?: number[]
  ) {
    const script = await repo.getById(scriptId);

    if (!script) {
      throw new AutoScriptNotFoundError();
    }

    if (script.userId !== userId) {
      throw new AutoScriptAccessDeniedError();
    }

    // Allow revision for scripts in "pending" or "revision" status
    if (script.status !== "pending" && script.status !== "revision") {
      throw new InvalidScriptStatusError(script.status);
    }

    // Check revision limit
    if (script.revisionCount >= MAX_REVISIONS) {
      // Auto-reject after max revisions
      await repo.reject(
        scriptId,
        "Maximum revision limit reached",
        RejectionCategory.OTHER
      );

      throw new MaxRevisionsReachedError(MAX_REVISIONS);
    }

    // Mark for revision with enhanced feedback
    await repo.markRevision(scriptId, feedbackText);

    // Update learning system with enhanced feedback
    try {
      await learningService.onRevise(userId, scriptId, feedbackText);
    } catch (learningError: any) {
      logger.error("Error in learning service onRevise", {
        userId,
        scriptId,
        error: learningError.message,
        stack: learningError.stack,
      });
      // Don't fail the request if learning service fails
    }

    // Get user's API key for conveyor processing
    let apiKey: string | null = null;
    try {
      const apiKeyRecord = await apiKeysService.getUserApiKey(userId, "anthropic");
      if (apiKeyRecord?.decryptedKey) {
        apiKey = apiKeyRecord.decryptedKey;
      }
    } catch (keyError: any) {
      logger.warn("Failed to get API key for revision", {
        userId,
        error: keyError.message,
      });
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
          // Start processing asynchronously (don't await)
          conveyorOrchestrator
            .processRevisionItem(revisionResult.conveyorItemId, apiKey)
            .then((result) => {
              logger.info("Revision processing completed", {
                userId,
                scriptId,
                conveyorItemId: revisionResult.conveyorItemId,
                success: result.success,
              });
            })
            .catch((err) => {
              logger.error("Revision processing failed", {
                userId,
                scriptId,
                conveyorItemId: revisionResult.conveyorItemId,
                error: err.message,
              });
            });

          logger.info("Auto script revision started", {
            userId,
            scriptId,
            conveyorItemId: revisionResult.conveyorItemId,
            revisionCount: script.revisionCount + 1,
            selectedSceneIds: selectedSceneIds || [],
          });
        } else {
          logger.warn("Failed to create revision item", {
            userId,
            scriptId,
            error: revisionResult.error,
          });
        }
      } catch (revisionError: any) {
        logger.error("Error creating revision item", {
          userId,
          scriptId,
          error: revisionError.message,
        });
        // Don't fail the request - revision is already marked
      }
    } else {
      logger.warn("No API key available for revision processing", {
        userId,
        scriptId,
      });
    }

    return {
      success: true,
      message: "Revision requested",
      revisionCount: script.revisionCount + 1,
    };
  },

  /**
   * Reset stuck revision
   */
  async resetRevision(scriptId: string, userId: string) {
    const script = await repo.getById(scriptId);

    if (!script) {
      throw new AutoScriptNotFoundError();
    }

    if (script.userId !== userId) {
      throw new AutoScriptAccessDeniedError();
    }

    // Only allow reset for scripts that are stuck in revision status
    // or have reached the revision limit
    if (script.status !== "revision" && script.revisionCount < MAX_REVISIONS) {
      throw new RevisionNotStuckError();
    }

    // Reset the revision state
    const updatedScript = await repo.resetRevision(scriptId);

    logger.info("Revision reset", {
      userId,
      scriptId,
      previousStatus: script.status,
      previousRevisionCount: script.revisionCount,
    });

    return {
      success: true,
      message: "Revision reset successfully",
      script: updatedScript,
    };
  },
};
