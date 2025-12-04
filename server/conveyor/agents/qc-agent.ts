/**
 * QC Agent (#6) - Quality Control
 * Checks script quality using multi-agent analysis
 * Uses existing analyzeScriptAdvanced (4 parallel + 1 synthesis)
 */
import { BaseAIAgent, type AgentContext } from "./base-agent";
import type { ScriptData, ArchitectureData, QCData, WeakSpot } from "../types";
import { analyzeScriptAdvanced } from "../../ai-services/advanced";

export interface QCInput {
  script: ScriptData;
  architecture: ArchitectureData;
}

export interface QCOutput {
  qc: QCData;
}

export class QCAgent extends BaseAIAgent<QCInput, QCOutput> {
  protected name = "QC";
  protected stage = 6;
  protected estimatedCost = 0.07; // 5 AI calls

  protected validate(input: QCInput): { valid: boolean; error?: string } {
    if (!input.script || !input.script.scenes || input.script.scenes.length === 0) {
      return { valid: false, error: "Script with scenes required" };
    }
    return { valid: true };
  }

  protected async execute(input: QCInput, context: AgentContext): Promise<QCOutput> {
    const { script, architecture } = input;

    this.emitThinking(context, "Запускаю мульти-агентный анализ качества сценария...");
    this.emitThinking(context, "4 агента проверяют: хук, структуру, эмоции и CTA...");

    // Use existing multi-agent analysis
    const analysisResult = await analyzeScriptAdvanced(
      context.apiKey!,
      script.fullScript,
      "custom_script"
    );

    // Convert to QC format
    const qc = this.convertToQCData(analysisResult, script);

    // Emit result
    if (qc.passedQC) {
      this.emitThinking(context, `QC пройден! Score: ${qc.overallScore}/100, Hook: ${qc.hookScore}/100`);
    } else {
      this.emitThinking(context, `QC не пройден. Score: ${qc.overallScore}/100. Найдено ${qc.weakSpots.length} проблем.`);
    }

    return { qc };
  }

  private convertToQCData(analysis: any, script: ScriptData): QCData {
    const hookScore = analysis.hookScore || 50;
    const structureScore = analysis.structureScore || 50;
    const emotionalScore = analysis.emotionalScore || 50;
    const ctaScore = analysis.ctaScore || 50;

    const overallScore = Math.round(
      (hookScore + structureScore + emotionalScore + ctaScore) / 4
    );

    // Extract weak spots from recommendations
    const weakSpots: WeakSpot[] = [];

    if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
      for (const rec of analysis.recommendations) {
        const sceneId = this.findRelevantScene(rec, script);
        weakSpots.push({
          sceneId,
          area: this.mapArea(rec.area),
          issue: rec.issue || rec.reasoning || "Issue detected",
          severity: this.mapSeverity(rec.priority),
          suggestion: rec.suggested || rec.suggestion || "",
        });
      }
    }

    // Add weak spots based on low scores
    if (hookScore < 70) {
      weakSpots.push({
        sceneId: 1,
        area: "hook",
        issue: "Hook score below threshold",
        severity: hookScore < 50 ? "critical" : "major",
        suggestion: "Strengthen the opening to grab attention immediately",
      });
    }

    if (ctaScore < 70) {
      weakSpots.push({
        sceneId: script.scenes.length,
        area: "cta",
        issue: "CTA score below threshold",
        severity: ctaScore < 50 ? "critical" : "major",
        suggestion: "Add a stronger call to action",
      });
    }

    // Determine if passed QC
    const hasCritical = weakSpots.some((w) => w.severity === "critical");
    const passedQC = overallScore >= 75 && !hasCritical && hookScore >= 70;

    return {
      overallScore,
      hookScore,
      structureScore,
      emotionalScore,
      ctaScore,
      weakSpots: weakSpots.slice(0, 5), // Limit to top 5
      passedQC,
    };
  }

  private findRelevantScene(rec: any, script: ScriptData): number {
    if (rec.sceneNumber) return rec.sceneNumber;

    const area = rec.area?.toLowerCase() || "";
    if (area === "hook" || area.includes("hook")) return 1;
    if (area === "cta" || area.includes("cta")) return script.scenes.length;
    if (area === "structure") return Math.ceil(script.scenes.length / 2);

    return 1;
  }

  private mapArea(area?: string): WeakSpot["area"] {
    if (!area) return "structure";
    const lower = area.toLowerCase();
    if (lower.includes("hook")) return "hook";
    if (lower.includes("emotion")) return "emotional";
    if (lower.includes("cta") || lower.includes("call")) return "cta";
    return "structure";
  }

  private mapSeverity(priority?: string): WeakSpot["severity"] {
    if (!priority) return "minor";
    const lower = priority.toLowerCase();
    if (lower === "critical" || lower === "high") return "critical";
    if (lower === "major" || lower === "medium") return "major";
    return "minor";
  }
}

export const qcAgent = new QCAgent();
