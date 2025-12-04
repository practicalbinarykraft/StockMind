/**
 * Conveyor Orchestrator
 * Runs items through the entire pipeline
 */
import { logger } from "../lib/logger";
import { conveyorItemsStorage } from "../storage/conveyor-items.storage";
import { conveyorSettingsStorage } from "../storage/conveyor-settings.storage";
import { conveyorLogsStorage } from "../storage/conveyor-logs.storage";
import { conveyorEvents } from "./conveyor-events";
import { createFeedbackProcessor } from "./feedback-processor";
import type { UserWritingContext } from "./types";
import {
  scoutAgent,
  scorerAgent,
  analystAgent,
  architectAgent,
  writerAgent,
  qcAgent,
  optimizerAgent,
  gateAgent,
  deliveryAgent,
  STAGES,
  type AgentContext,
} from "./agents";
import type {
  SourceData,
  ScoringData,
  AnalysisData,
  ArchitectureData,
  ScriptData,
  QCData,
  OptimizationData,
  GateData,
  ConveyorItemData,
} from "./types";
import type { RevisionContext } from "./revision-processor";

const MAX_QC_ITERATIONS = 2;

export class ConveyorOrchestrator {
  /**
   * Process a single source item through the entire pipeline
   */
  async processItem(
    userId: string,
    sourceData: SourceData,
    apiKey: string
  ): Promise<{ success: boolean; itemId: string; scriptId?: string; error?: string }> {
    const startTime = Date.now();

    // Create conveyor item
    const item = await conveyorItemsStorage.create({
      userId,
      sourceType: sourceData.type,
      sourceItemId: sourceData.itemId,
      status: "processing",
    });

    const context: AgentContext = {
      userId,
      itemId: item.id,
      apiKey,
    };

    // Save source data
    await conveyorItemsStorage.updateStageData(item.id, STAGES.SCOUT, sourceData);

    // Emit item started event for SSE
    conveyorEvents.itemStarted(userId, item.id, sourceData.title);

    try {
      // Validate API key
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is required for conveyor processing');
      }

      // Get user settings for thresholds and patterns
      const settings = await conveyorSettingsStorage.getSettings(userId);

      // Helper to safely get array from JSONB
      const getArray = (value: any, defaultValue: any[] = []): any[] => {
        return Array.isArray(value) ? value : defaultValue;
      };

      // Helper to safely get object from JSONB
      const getObject = (value: any, defaultValue: any = {}): any => {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : defaultValue;
      };

      // Stage 2: Scorer
      const scorerResult = await scorerAgent.process(
        { source: sourceData, learnedThreshold: settings?.learnedThreshold ?? undefined },
        context
      );
      if (!scorerResult.success || !scorerResult.data) {
        throw new Error(`Scorer failed: ${scorerResult.error}`);
      }
      if (!scorerResult.data.passed) {
        return this.failItem(item.id, STAGES.SCORER, "Score below threshold", startTime);
      }
      await this.saveStageData(item.id, STAGES.SCORER, scorerResult.data.scoring, scorerResult.cost);
      const scoring = scorerResult.data.scoring;

      // Stage 3: Analyst
      const analystResult = await analystAgent.process(
        {
          source: sourceData,
          scoring,
          avoidedTopics: getArray(settings?.avoidedTopics, []),
        },
        context
      );
      if (!analystResult.success || !analystResult.data) {
        throw new Error(`Analyst failed: ${analystResult.error}`);
      }
      if (!analystResult.data.passed) {
        return this.failItem(item.id, STAGES.ANALYST, "Topic avoided or insufficient facts", startTime);
      }
      await this.saveStageData(item.id, STAGES.ANALYST, analystResult.data.analysis, analystResult.cost);
      const analysis = analystResult.data.analysis;

      // Stage 4: Architect
      const architectResult = await architectAgent.process(
        {
          analysis,
          scoring,
          preferredFormats: getArray(settings?.preferredFormats, []),
          // Phase 1: Duration and style settings
          durationRange: (settings?.durationRange && typeof settings.durationRange === 'object' && 'min' in settings.durationRange && 'max' in settings.durationRange)
            ? settings.durationRange as { min: number; max: number }
            : { min: 30, max: 90 },
          stylePreferences: (settings?.stylePreferences && typeof settings.stylePreferences === 'object')
            ? settings.stylePreferences as { formality: string; tone: string; language: string }
            : undefined,
          // Phase 2: Custom prompt
          customPrompt: getObject(settings?.customPrompts)?.architectPrompt || undefined,
        },
        context
      );
      if (!architectResult.success || !architectResult.data) {
        throw new Error(`Architect failed: ${architectResult.error}`);
      }
      await this.saveStageData(item.id, STAGES.ARCHITECT, architectResult.data.architecture, architectResult.cost);
      const architecture = architectResult.data.architecture;

      // Stage 5: Writer
      // Get user writing context from feedback learning
      let userWritingContext: UserWritingContext | undefined;
      try {
        const feedbackProcessor = createFeedbackProcessor(apiKey);
        userWritingContext = await feedbackProcessor.getWriterContext(userId);
      } catch (e: any) {
        logger.warn("[Orchestrator] Failed to get user writing context", { error: e.message });
      }

      const writerResult = await writerAgent.process(
        {
          source: sourceData,
          analysis,
          architecture,
          rejectionPatterns: getObject(settings?.rejectionPatterns, {}),
          // Phase 1: Style customization
          stylePreferences: (settings?.stylePreferences && typeof settings.stylePreferences === 'object')
            ? settings.stylePreferences as { formality: string; tone: string; language: string }
            : undefined,
          customGuidelines: getArray(settings?.customGuidelines, []),
          // Phase 2: Custom prompt
          customPrompt: getObject(settings?.customPrompts)?.writerPrompt || undefined,
          // Phase 3: Script examples
          scriptExamples: getArray(settings?.scriptExamples, []),
          // User writing profile from feedback learning
          userWritingContext,
        },
        context
      );
      if (!writerResult.success || !writerResult.data) {
        throw new Error(`Writer failed: ${writerResult.error}`);
      }
      await this.saveStageData(item.id, STAGES.WRITER, writerResult.data.script, writerResult.cost);
      let script = writerResult.data.script;

      // Stage 6-7: QC + Optimizer loop
      const qcResult = await this.runQCLoop(item.id, script, architecture, context);
      if (!qcResult.success) {
        return this.failItem(item.id, STAGES.QC, qcResult.error || "QC failed", startTime);
      }
      const { qc, optimization, script: optimizedScript } = qcResult;
      script = optimizedScript;

      // Stage 8: Gate
      const gateResult = await gateAgent.process(
        {
          qc,
          optimization,
          approvalRate: settings?.approvalRate ? Number(settings.approvalRate) : undefined,
        },
        context
      );
      if (!gateResult.success || !gateResult.data) {
        throw new Error(`Gate failed: ${gateResult.error}`);
      }
      await this.saveStageData(item.id, STAGES.GATE, gateResult.data.gate, 0);
      const gate = gateResult.data.gate;

      // Stage 9: Delivery
      const deliveryResult = await deliveryAgent.process(
        { itemId: item.id, source: sourceData, analysis, architecture, script, qc, gate },
        context
      );
      if (!deliveryResult.success || !deliveryResult.data) {
        throw new Error(`Delivery failed: ${deliveryResult.error}`);
      }

      // Mark completed
      const totalMs = Date.now() - startTime;
      await conveyorItemsStorage.markCompleted(item.id, totalMs);

      // Emit item completed event for SSE
      conveyorEvents.itemCompleted(userId, item.id, deliveryResult.data.scriptId || undefined);

      logger.info(`[Conveyor] Item completed`, {
        itemId: item.id,
        scriptId: deliveryResult.data.scriptId,
        delivered: deliveryResult.data.delivered,
        totalMs,
      });

      return {
        success: true,
        itemId: item.id,
        scriptId: deliveryResult.data.scriptId || undefined,
      };
    } catch (error: any) {
      logger.error(`[Conveyor] Pipeline error`, {
        itemId: item.id,
        error: error.message,
      });

      // Emit item failed event for SSE
      conveyorEvents.itemFailed(userId, item.id, error.message);

      await conveyorItemsStorage.markFailed(item.id, 0, error.message);

      return {
        success: false,
        itemId: item.id,
        error: error.message,
      };
    }
  }

  /**
   * Run QC + Optimizer loop
   */
  private async runQCLoop(
    itemId: string,
    script: ScriptData,
    architecture: ArchitectureData,
    context: AgentContext
  ): Promise<{
    success: boolean;
    qc: QCData;
    optimization?: OptimizationData;
    script: ScriptData;
    error?: string;
  }> {
    let currentScript = script;
    let lastQC: QCData | null = null;
    let lastOptimization: OptimizationData | undefined;

    for (let iteration = 0; iteration <= MAX_QC_ITERATIONS; iteration++) {
      // Run QC
      const qcResult = await qcAgent.process(
        { script: currentScript, architecture },
        context
      );

      if (!qcResult.success || !qcResult.data) {
        return { success: false, qc: lastQC!, script: currentScript, error: qcResult.error };
      }

      lastQC = qcResult.data.qc;
      await this.saveStageData(itemId, STAGES.QC, lastQC, qcResult.cost);

      // If passed QC, we're done
      if (lastQC.passedQC || iteration === MAX_QC_ITERATIONS) {
        break;
      }

      // Run Optimizer
      const optResult = await optimizerAgent.process(
        { script: currentScript, qc: lastQC, iteration: iteration + 1 },
        context
      );

      if (!optResult.success || !optResult.data) {
        break; // Continue with current script
      }

      lastOptimization = optResult.data.optimization;
      await this.saveStageData(itemId, STAGES.OPTIMIZER, lastOptimization, optResult.cost);

      // Update script if changes were made
      if (optResult.data.needsReQC) {
        currentScript = {
          scenes: lastOptimization.improvedScenes,
          fullScript: lastOptimization.fullScript,
          estimatedDuration: script.estimatedDuration,
        };
      } else {
        break;
      }
    }

    return {
      success: true,
      qc: lastQC!,
      optimization: lastOptimization,
      script: currentScript,
    };
  }

  private async saveStageData(itemId: string, stage: number, data: any, cost: number): Promise<void> {
    await conveyorItemsStorage.updateStageData(itemId, stage, data);
    if (cost > 0) {
      await conveyorItemsStorage.addCost(itemId, cost);
    }
  }

  private async failItem(
    itemId: string,
    stage: number,
    reason: string,
    startTime: number
  ): Promise<{ success: boolean; itemId: string; error: string }> {
    await conveyorItemsStorage.markFailed(itemId, stage, reason);
    logger.info(`[Conveyor] Item failed at stage ${stage}`, { itemId, reason });
    return { success: false, itemId, error: reason };
  }

  /**
   * Process a revision item through the pipeline (stages 5-9 only)
   * Skips Scout/Scorer/Analyst/Architect stages - uses data from parent item
   */
  async processRevisionItem(
    conveyorItemId: string,
    apiKey: string
  ): Promise<{ success: boolean; itemId: string; scriptId?: string; error?: string }> {
    const startTime = Date.now();

    // Get the conveyor item
    const item = await conveyorItemsStorage.getById(conveyorItemId);
    if (!item) {
      return { success: false, itemId: conveyorItemId, error: "Conveyor item not found" };
    }

    // Validate this is a revision item
    if (!item.revisionContext || !item.parentItemId) {
      return { success: false, itemId: conveyorItemId, error: "Not a revision item" };
    }

    const revisionContext = item.revisionContext as RevisionContext;

    const context: AgentContext = {
      userId: item.userId,
      itemId: item.id,
      apiKey,
    };

    try {
      // Validate API key
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is required for conveyor processing');
      }

      // Get stage data from parent item (already copied during createForRevision)
      const sourceData = item.sourceData as SourceData;
      const scoring = item.scoringData as ScoringData;
      const analysis = item.analysisData as AnalysisData;
      const architecture = item.architectureData as ArchitectureData;

      if (!sourceData || !analysis || !architecture) {
        throw new Error("Missing required stage data from parent item");
      }

      // Get user settings
      const settings = await conveyorSettingsStorage.getSettings(item.userId);

      // Helper to safely get array from JSONB
      const getArray = (value: any, defaultValue: any[] = []): any[] => {
        return Array.isArray(value) ? value : defaultValue;
      };

      // Helper to safely get object from JSONB
      const getObject = (value: any, defaultValue: any = {}): any => {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : defaultValue;
      };

      // Stage 5: Writer (with revision context)
      // Get user writing context from feedback learning
      let userWritingContext: UserWritingContext | undefined;
      try {
        const feedbackProcessor = createFeedbackProcessor(apiKey);
        userWritingContext = await feedbackProcessor.getWriterContext(item.userId);
      } catch (e: any) {
        logger.warn("[Orchestrator] Failed to get user writing context", { error: e.message });
      }

      const writerResult = await writerAgent.process(
        {
          source: sourceData,
          analysis,
          architecture,
          rejectionPatterns: getObject(settings?.rejectionPatterns, {}),
          stylePreferences: (settings?.stylePreferences && typeof settings.stylePreferences === 'object')
            ? settings.stylePreferences as { formality: string; tone: string; language: string }
            : undefined,
          customGuidelines: getArray(settings?.customGuidelines, []),
          customPrompt: getObject(settings?.customPrompts)?.writerPrompt || undefined,
          // Phase 3: Script examples
          scriptExamples: getArray(settings?.scriptExamples, []),
          userWritingContext,
          // Revision-specific context (EnhancedRevisionContext format)
          revisionContext: {
            notes: revisionContext.notes,
            previousScriptId: revisionContext.previousScriptId,
            attempt: revisionContext.attempt,
            previousVersions: revisionContext.previousVersions,
            selectedSceneIds: revisionContext.selectedSceneIds,
          },
        },
        context
      );
      if (!writerResult.success || !writerResult.data) {
        throw new Error(`Writer failed: ${writerResult.error}`);
      }
      await this.saveStageData(item.id, STAGES.WRITER, writerResult.data.script, writerResult.cost);
      let script = writerResult.data.script;

      // Stage 6-7: QC + Optimizer loop
      const qcResult = await this.runQCLoop(item.id, script, architecture, context);
      if (!qcResult.success) {
        return this.failItem(item.id, STAGES.QC, qcResult.error || "QC failed", startTime);
      }
      const { qc, optimization, script: optimizedScript } = qcResult;
      script = optimizedScript;

      // Stage 8: Gate
      const gateResult = await gateAgent.process(
        {
          qc,
          optimization,
          approvalRate: settings?.approvalRate ? Number(settings.approvalRate) : undefined,
        },
        context
      );
      if (!gateResult.success || !gateResult.data) {
        throw new Error(`Gate failed: ${gateResult.error}`);
      }
      await this.saveStageData(item.id, STAGES.GATE, gateResult.data.gate, 0);
      const gate = gateResult.data.gate;

      // Stage 9: Delivery (with revision context)
      const deliveryResult = await deliveryAgent.process(
        {
          itemId: item.id,
          source: sourceData,
          analysis,
          architecture,
          script,
          qc,
          gate,
          revisionContext, // Pass revision context for version creation
        },
        context
      );
      if (!deliveryResult.success || !deliveryResult.data) {
        throw new Error(`Delivery failed: ${deliveryResult.error}`);
      }

      // Mark completed
      const totalMs = Date.now() - startTime;
      await conveyorItemsStorage.markCompleted(item.id, totalMs);

      // Emit item completed event for SSE
      conveyorEvents.itemCompleted(item.userId, item.id, deliveryResult.data.scriptId || undefined);

      logger.info(`[Conveyor] Revision completed`, {
        itemId: item.id,
        scriptId: deliveryResult.data.scriptId,
        delivered: deliveryResult.data.delivered,
        attempt: revisionContext.attempt,
        totalMs,
      });

      return {
        success: true,
        itemId: item.id,
        scriptId: deliveryResult.data.scriptId || undefined,
      };
    } catch (error: any) {
      logger.error(`[Conveyor] Revision pipeline error`, {
        itemId: item.id,
        error: error.message,
      });

      // Emit item failed event for SSE
      conveyorEvents.itemFailed(item.userId, item.id, error.message);

      await conveyorItemsStorage.markFailed(item.id, 0, error.message);

      return {
        success: false,
        itemId: item.id,
        error: error.message,
      };
    }
  }
}

export const conveyorOrchestrator = new ConveyorOrchestrator();
