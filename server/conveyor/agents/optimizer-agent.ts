/**
 * Optimizer Agent (#7)
 * Improves script based on QC feedback
 * Uses AI to fix weak spots
 */
import { BaseAIAgent, type AgentContext } from "./base-agent";
import type {
  ScriptData,
  ScriptScene,
  QCData,
  OptimizationData,
  OptimizationChange,
} from "../types";
import Anthropic from "@anthropic-ai/sdk";

export interface OptimizerInput {
  script: ScriptData;
  qc: QCData;
  iteration: number;
}

export interface OptimizerOutput {
  optimization: OptimizationData;
  needsReQC: boolean;
}

const MAX_ITERATIONS = 2;

export class OptimizerAgent extends BaseAIAgent<OptimizerInput, OptimizerOutput> {
  protected name = "Optimizer";
  protected stage = 7;
  protected estimatedCost = 0.015;

  protected validate(input: OptimizerInput): { valid: boolean; error?: string } {
    if (!input.script || !input.qc) {
      return { valid: false, error: "Script and QC data required" };
    }
    if (input.iteration > MAX_ITERATIONS) {
      return { valid: false, error: `Max iterations (${MAX_ITERATIONS}) exceeded` };
    }
    return { valid: true };
  }

  protected async execute(input: OptimizerInput, context: AgentContext): Promise<OptimizerOutput> {
    const { script, qc, iteration } = input;

    // If already passed QC, no optimization needed
    if (qc.passedQC) {
      this.emitThinking(context, "QC уже пройден, оптимизация не требуется.");
      return {
        optimization: {
          improvedScenes: script.scenes,
          changesApplied: [],
          fullScript: script.fullScript,
          iterationNumber: iteration,
        },
        needsReQC: false,
      };
    }

    // Get weak spots to fix
    const weakSpots = qc.weakSpots.filter((w) => w.severity !== "minor");

    if (weakSpots.length === 0) {
      this.emitThinking(context, "Нет серьезных проблем для исправления.");
      return {
        optimization: {
          improvedScenes: script.scenes,
          changesApplied: [],
          fullScript: script.fullScript,
          iterationNumber: iteration,
        },
        needsReQC: false,
      };
    }

    this.emitThinking(context, `Оптимизация #${iteration}: исправляю ${weakSpots.length} проблем...`);

    const client = new Anthropic({ apiKey: context.apiKey });
    const prompt = this.buildPrompt(script, weakSpots);

    this.emitThinking(context, "Переписываю слабые места сценария...");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const optimization = this.parseResponse(content.text, script, iteration);

    if (optimization.changesApplied.length > 0) {
      this.emitThinking(context, `Внесено ${optimization.changesApplied.length} улучшений. Отправляю на повторный QC...`);
    } else {
      this.emitThinking(context, "Оптимизация завершена без изменений.");
    }

    return {
      optimization,
      needsReQC: optimization.changesApplied.length > 0,
    };
  }

  private buildPrompt(script: ScriptData, weakSpots: QCData["weakSpots"]): string {
    const scenesText = script.scenes
      .map((s) => `[${s.id}] ${s.label.toUpperCase()}: "${s.text}"`)
      .join("\n\n");

    const issuesText = weakSpots
      .map((w) => `- Сцена ${w.sceneId} (${w.area}): ${w.issue}\n  Рекомендация: ${w.suggestion}`)
      .join("\n\n");

    return `Улучши сценарий по результатам проверки качества.

ТЕКУЩИЙ СЦЕНАРИЙ:
${scenesText}

ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:
${issuesText}

ЗАДАЧА:
1. Исправь каждую проблему согласно рекомендациям
2. Сохрани то, что работает хорошо
3. Не меняй общую структуру и тайминги

Ответь ТОЛЬКО JSON:
{
  "improvedScenes": [
    {"id": 1, "label": "hook", "text": "Улучшенный текст", "start": 0, "end": 5},
    ...
  ],
  "changesApplied": [
    {
      "sceneId": 1,
      "original": "Было...",
      "improved": "Стало...",
      "reason": "Почему изменил"
    }
  ],
  "fullScript": "Полный улучшенный текст"
}`;
  }

  private parseResponse(
    text: string,
    originalScript: ScriptData,
    iteration: number
  ): OptimizationData {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found");
      }

      const data = JSON.parse(jsonMatch[0]);

      const improvedScenes: ScriptScene[] = (data.improvedScenes || []).map(
        (s: any, i: number) => ({
          id: s.id || i + 1,
          label: s.label || originalScript.scenes[i]?.label || "main",
          text: s.text || originalScript.scenes[i]?.text || "",
          start: s.start ?? originalScript.scenes[i]?.start ?? 0,
          end: s.end ?? originalScript.scenes[i]?.end ?? 0,
          visualNotes: s.visualNotes || originalScript.scenes[i]?.visualNotes,
        })
      );

      const changesApplied: OptimizationChange[] = (data.changesApplied || []).map(
        (c: any) => ({
          sceneId: c.sceneId || 1,
          original: c.original || "",
          improved: c.improved || "",
          reason: c.reason || "",
        })
      );

      const fullScript =
        data.fullScript || improvedScenes.map((s) => s.text).join(" ");

      return {
        improvedScenes,
        changesApplied,
        fullScript,
        iterationNumber: iteration,
      };
    } catch (error) {
      // Return original on parse error
      return {
        improvedScenes: originalScript.scenes,
        changesApplied: [],
        fullScript: originalScript.fullScript,
        iterationNumber: iteration,
      };
    }
  }
}

export const optimizerAgent = new OptimizerAgent();
