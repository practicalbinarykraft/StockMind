/**
 * Delivery Agent (#9)
 * Saves results to database
 * Does NOT use AI - pure data operations
 */
import { BaseAgent, type AgentContext } from "./base-agent";
import type {
  SourceData,
  AnalysisData,
  ArchitectureData,
  ScriptData,
  QCData,
  GateData,
} from "../types";
import { autoScriptsStorage } from "../../storage/auto-scripts.storage";
import { conveyorSettingsStorage } from "../../storage/conveyor-settings.storage";
import { conveyorLogsStorage } from "../../storage/conveyor-logs.storage";
import { autoScriptVersionsStorage } from "../../storage/user-writing-profile.storage";
import type { InsertAutoScript } from "@shared/schema";
import type { RevisionContext } from "../revision-processor";

export interface DeliveryInput {
  itemId: string;
  source: SourceData;
  analysis: AnalysisData;
  architecture: ArchitectureData;
  script: ScriptData;
  qc: QCData;
  gate: GateData;
  revisionContext?: RevisionContext;
}

export interface DeliveryOutput {
  scriptId: string | null;
  delivered: boolean;
}

export class DeliveryAgent extends BaseAgent<DeliveryInput, DeliveryOutput> {
  protected name = "Delivery";
  protected stage = 9;
  protected usesAI = false;

  protected validate(input: DeliveryInput): { valid: boolean; error?: string } {
    if (!input.gate) {
      return { valid: false, error: "Gate decision required" };
    }
    return { valid: true };
  }

  protected async execute(input: DeliveryInput, context: AgentContext): Promise<DeliveryOutput> {
    const { itemId, source, analysis, architecture, script, qc, gate, revisionContext } = input;

    // If FAIL, don't create/update auto_script, just log and update stats
    if (gate.decision === "FAIL") {
      this.emitThinking(context, "Сценарий не прошел проверку. Сохраняю в статистику отказов...");
      await conveyorSettingsStorage.incrementFailed(context.userId);

      await conveyorLogsStorage.create({
        userId: context.userId,
        conveyorItemId: itemId,
        eventType: "item_failed",
        details: {
          reason: gate.reason,
          finalScore: gate.finalScore,
          isRevision: !!revisionContext,
        },
      });

      return { scriptId: null, delivered: false };
    }

    // Check if this is a revision
    if (revisionContext) {
      return this.executeRevision(input, context);
    }

    // Create new auto_script for PASS or NEEDS_REVIEW
    this.emitThinking(context, `Создаю сценарий "${analysis.mainTopic.substring(0, 40)}..."...`);

    const autoScriptData: InsertAutoScript = {
      userId: context.userId,
      conveyorItemId: itemId,
      sourceType: source.type,
      sourceItemId: source.itemId,
      title: analysis.mainTopic,
      scenes: script.scenes as any,
      fullScript: script.fullScript,
      formatId: architecture.formatId,
      formatName: architecture.formatName,
      estimatedDuration: script.estimatedDuration,
      initialScore: qc.overallScore,
      finalScore: gate.finalScore,
      hookScore: qc.hookScore,
      structureScore: qc.structureScore,
      emotionalScore: qc.emotionalScore,
      ctaScore: qc.ctaScore,
      gateDecision: gate.decision,
      gateConfidence: String(gate.confidence),
      status: "pending",
    };

    const autoScript = await autoScriptsStorage.create(autoScriptData);

    this.emitThinking(context, `🎉 Сценарий готов! Score: ${gate.finalScore}/100, формат: ${architecture.formatName}`);

    // Update stats
    await conveyorSettingsStorage.incrementPassed(context.userId);

    // Log success
    await conveyorLogsStorage.create({
      userId: context.userId,
      conveyorItemId: itemId,
      eventType: "script_created",
      details: {
        scriptId: autoScript.id,
        decision: gate.decision,
        finalScore: gate.finalScore,
      },
    });

    return { scriptId: autoScript.id, delivered: true };
  }

  /**
   * Handle revision delivery - updates existing script instead of creating new one
   */
  private async executeRevision(input: DeliveryInput, context: AgentContext): Promise<DeliveryOutput> {
    const { itemId, script, qc, gate, revisionContext } = input;

    if (!revisionContext) {
      throw new Error("Revision context is required for revision delivery");
    }

    const scriptId = revisionContext.previousScriptId;
    this.emitThinking(context, `Обновляю сценарий после доработки (попытка ${revisionContext.attempt})...`);

    // 1. Update the existing auto_script
    const updatedScript = await autoScriptsStorage.updateAfterRevision(scriptId, {
      scenes: script.scenes as any,
      fullScript: script.fullScript,
      initialScore: qc.overallScore,
      finalScore: gate.finalScore,
      hookScore: qc.hookScore,
      structureScore: qc.structureScore,
      emotionalScore: qc.emotionalScore,
      ctaScore: qc.ctaScore,
      gateDecision: gate.decision,
      gateConfidence: String(gate.confidence),
    });

    if (!updatedScript) {
      throw new Error(`Failed to update script ${scriptId}`);
    }

    // 2. Create version record
    await autoScriptVersionsStorage.create({
      autoScriptId: scriptId,
      versionNumber: revisionContext.attempt,
      title: updatedScript.title,
      scenes: script.scenes as any,
      fullScript: script.fullScript,
      finalScore: gate.finalScore,
      hookScore: qc.hookScore,
      structureScore: qc.structureScore,
      emotionalScore: qc.emotionalScore,
      ctaScore: qc.ctaScore,
      feedbackText: revisionContext.notes,
      feedbackSceneIds: revisionContext.selectedSceneIds,
    });

    this.emitThinking(context, `🎉 Сценарий обновлён! Score: ${gate.finalScore}/100`);

    // Log success
    await conveyorLogsStorage.create({
      userId: context.userId,
      conveyorItemId: itemId,
      eventType: "script_revised",
      details: {
        scriptId,
        attempt: revisionContext.attempt,
        decision: gate.decision,
        finalScore: gate.finalScore,
      },
    });

    return { scriptId, delivered: true };
  }
}

export const deliveryAgent = new DeliveryAgent();
