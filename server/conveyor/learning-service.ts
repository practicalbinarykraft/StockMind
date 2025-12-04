/**
 * Learning Service
 * Learns from user feedback to improve future script generation
 */
import { logger } from "../lib/logger";
import { conveyorSettingsStorage } from "../storage/conveyor-settings.storage";
import { autoScriptsStorage } from "../storage/auto-scripts.storage";
import { conveyorLogsStorage } from "../storage/conveyor-logs.storage";
import {
  userWritingProfileStorage,
  userFeedbackEntriesStorage,
  autoScriptVersionsStorage,
} from "../storage/user-writing-profile.storage";
import { createFeedbackProcessor } from "./feedback-processor";
import { storage } from "../storage";
import type { RejectionPatterns, RejectionPattern } from "./types";
import { RejectionCategory } from "@shared/schema";

// Instructions for each rejection category
const CATEGORY_INSTRUCTIONS: Record<string, string> = {
  [RejectionCategory.TOO_LONG]: "Сценарий должен быть до 60 секунд",
  [RejectionCategory.TOO_SHORT]: "Сценарий должен быть минимум 45 секунд",
  [RejectionCategory.BORING_INTRO]: "Начинай с провокации, вопроса или шока",
  [RejectionCategory.WEAK_CTA]: "Добавь сильный призыв к действию в конце",
  [RejectionCategory.TOO_FORMAL]: "Пиши разговорным языком, как друг",
  [RejectionCategory.TOO_CASUAL]: "Добавь экспертности и фактов",
  [RejectionCategory.BORING_TOPIC]: "Найди более интересный угол подачи",
  [RejectionCategory.WRONG_TONE]: "Используй правильный тон для аудитории",
  [RejectionCategory.NO_HOOK]: "Первые 5 сек должны захватить внимание",
  [RejectionCategory.TOO_COMPLEX]: "Упрости, объясняй как для 12-летнего",
  [RejectionCategory.OFF_TOPIC]: "Строго придерживайся темы статьи",
  [RejectionCategory.OTHER]: "",
};

export class LearningService {
  /**
   * Handle script approval
   */
  async onApprove(userId: string, scriptId: string): Promise<void> {
    const script = await autoScriptsStorage.getById(scriptId);
    if (!script) return;

    const settings = await conveyorSettingsStorage.getSettings(userId);
    if (!settings) return;

    // Update approval stats
    await conveyorSettingsStorage.incrementApproved(userId);

    // Remember format as successful
    const preferredFormats = (settings.preferredFormats as string[]) || [];
    if (script.formatId && !preferredFormats.includes(script.formatId)) {
      preferredFormats.push(script.formatId);
      await conveyorSettingsStorage.updateSettings(userId, {
        preferredFormats: preferredFormats as any,
      });
    }

    // If score was borderline and approval rate is high, lower threshold
    const approvalRate = settings.approvalRate ? Number(settings.approvalRate) : 0;
    if (script.finalScore < 75 && approvalRate > 0.8) {
      const currentThreshold = settings.learnedThreshold || settings.minScoreThreshold;
      const newThreshold = Math.max(currentThreshold - 2, 60);
      await conveyorSettingsStorage.updateSettings(userId, {
        learnedThreshold: newThreshold,
      });

      await conveyorLogsStorage.create({
        userId,
        eventType: "threshold_adjusted",
        details: { oldThreshold: currentThreshold, newThreshold, reason: "high_approval_rate" },
      });
    }

    logger.info("[Learning] Script approved", { userId, scriptId, formatId: script.formatId });
  }

  /**
   * Handle script rejection
   */
  async onReject(
    userId: string,
    scriptId: string,
    reason: string,
    category: string
  ): Promise<void> {
    const script = await autoScriptsStorage.getById(scriptId);
    if (!script) return;

    const settings = await conveyorSettingsStorage.getSettings(userId);
    if (!settings) return;

    // Update rejection stats
    await conveyorSettingsStorage.incrementRejected(userId);

    // Update rejection patterns
    const patterns: RejectionPatterns = (settings.rejectionPatterns as any) || {};
    const pattern: RejectionPattern = patterns[category] || {
      count: 0,
      instruction: CATEGORY_INSTRUCTIONS[category] || reason,
    };
    pattern.count++;
    pattern.lastReason = reason;
    patterns[category] = pattern;

    await conveyorSettingsStorage.updateSettings(userId, {
      rejectionPatterns: patterns as any,
    });

    // If category is "boring_topic", add to avoided topics
    if (category === RejectionCategory.BORING_TOPIC && script.title) {
      const avoidedTopics = (settings.avoidedTopics as string[]) || [];
      if (!avoidedTopics.includes(script.title)) {
        avoidedTopics.push(script.title);
        await conveyorSettingsStorage.updateSettings(userId, {
          avoidedTopics: avoidedTopics as any,
        });

        await conveyorLogsStorage.create({
          userId,
          eventType: "topic_avoided",
          details: { topic: script.title },
        });
      }
    }

    // If rejection rate > 50%, raise threshold
    const approvalRate = settings.approvalRate ? Number(settings.approvalRate) : 0.5;
    if (approvalRate < 0.5) {
      const currentThreshold = settings.learnedThreshold || settings.minScoreThreshold;
      const newThreshold = Math.min(currentThreshold + 5, 90);
      await conveyorSettingsStorage.updateSettings(userId, {
        learnedThreshold: newThreshold,
      });

      await conveyorLogsStorage.create({
        userId,
        eventType: "threshold_adjusted",
        details: { oldThreshold: currentThreshold, newThreshold, reason: "low_approval_rate" },
      });
    }

    await conveyorLogsStorage.logScriptRejected(userId, scriptId, reason, category);

    logger.info("[Learning] Script rejected", { userId, scriptId, category, reason });
  }

  /**
   * Handle revision request
   */
  async onRevise(userId: string, scriptId: string, notes: string): Promise<void> {
    // Get the script for context
    const script = await autoScriptsStorage.getById(scriptId);
    
    if (!script) {
      logger.warn("[Learning] Script not found for revision", { scriptId });
      return;
    }

    // Store feedback entry for AI processing
    try {
      await userFeedbackEntriesStorage.create({
        userId,
        autoScriptId: scriptId,
        feedbackType: "revision",
        feedbackText: notes,
        originalScript: script.fullScript || null,
        originalScenes: (script.scenes as any) || null,
      });
    } catch (error: any) {
      logger.error("[Learning] Failed to create feedback entry", {
        userId,
        scriptId,
        error: error.message,
        stack: error.stack,
      });
      throw error; // Re-throw to be caught by route handler
    }

    // Ensure user writing profile exists
    await userWritingProfileStorage.getOrCreate(userId);
    await userWritingProfileStorage.incrementFeedbackCount(userId);

    // Try to process with AI if API key available
    try {
      const apiKeyRecord = await storage.getUserApiKey(userId, "anthropic");
      if (apiKeyRecord?.encryptedKey) {
        const { decryptApiKey } = await import("../storage/base/encryption");
        const apiKey = decryptApiKey(apiKeyRecord.encryptedKey);
        const processor = createFeedbackProcessor(apiKey);
        await processor.processUserFeedback(userId);
      }
    } catch (error: any) {
      logger.warn("[Learning] AI processing skipped", { error: error.message });
    }

    // Legacy: Extract patterns from notes using keyword matching
    const patterns = this.extractPatternsFromNotes(notes);

    if (patterns.length > 0) {
      const settings = await conveyorSettingsStorage.getSettings(userId);
      if (!settings) return;

      const existingPatterns: RejectionPatterns = (settings.rejectionPatterns as any) || {};

      for (const { category, instruction } of patterns) {
        const pattern = existingPatterns[category] || { count: 0, instruction };
        pattern.count++;
        existingPatterns[category] = pattern;
      }

      await conveyorSettingsStorage.updateSettings(userId, {
        rejectionPatterns: existingPatterns as any,
      });
    }

    logger.info("[Learning] Revision requested", { userId, scriptId, patternsFound: patterns.length });
  }

  /**
   * Extract patterns from revision notes
   */
  private extractPatternsFromNotes(notes: string): Array<{ category: string; instruction: string }> {
    const patterns: Array<{ category: string; instruction: string }> = [];
    const lower = notes.toLowerCase();

    if (lower.includes("корот") || lower.includes("сокра") || lower.includes("меньше")) {
      patterns.push({ category: RejectionCategory.TOO_LONG, instruction: CATEGORY_INSTRUCTIONS[RejectionCategory.TOO_LONG] });
    }
    if (lower.includes("длин") || lower.includes("больше") || lower.includes("подроб")) {
      patterns.push({ category: RejectionCategory.TOO_SHORT, instruction: CATEGORY_INSTRUCTIONS[RejectionCategory.TOO_SHORT] });
    }
    if (lower.includes("начал") || lower.includes("hook") || lower.includes("хук")) {
      patterns.push({ category: RejectionCategory.BORING_INTRO, instruction: CATEGORY_INSTRUCTIONS[RejectionCategory.BORING_INTRO] });
    }
    if (lower.includes("призыв") || lower.includes("cta") || lower.includes("подпис")) {
      patterns.push({ category: RejectionCategory.WEAK_CTA, instruction: CATEGORY_INSTRUCTIONS[RejectionCategory.WEAK_CTA] });
    }
    if (lower.includes("прост") || lower.includes("разговор") || lower.includes("легче")) {
      patterns.push({ category: RejectionCategory.TOO_FORMAL, instruction: CATEGORY_INSTRUCTIONS[RejectionCategory.TOO_FORMAL] });
    }
    if (lower.includes("сложн") || lower.includes("непонят")) {
      patterns.push({ category: RejectionCategory.TOO_COMPLEX, instruction: CATEGORY_INSTRUCTIONS[RejectionCategory.TOO_COMPLEX] });
    }

    return patterns;
  }

  /**
   * Get instructions for Writer agent based on learned patterns
   */
  async getWriterInstructions(userId: string): Promise<string[]> {
    const settings = await conveyorSettingsStorage.getSettings(userId);
    if (!settings) return [];

    const patterns: RejectionPatterns = (settings.rejectionPatterns as any) || {};
    const instructions: string[] = [];

    for (const [_, pattern] of Object.entries(patterns)) {
      if (pattern.count >= 2 && pattern.instruction) {
        instructions.push(pattern.instruction);
      }
    }

    return instructions;
  }
}

export const learningService = new LearningService();
