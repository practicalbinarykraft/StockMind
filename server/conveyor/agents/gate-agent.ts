/**
 * Gate Agent (#8)
 * Makes final decision: PASS / FAIL / NEEDS_REVIEW
 * Does NOT use AI - pure logic based on scores
 */
import { BaseAgent, type AgentContext } from "./base-agent";
import type { QCData, OptimizationData, GateData } from "../types";

export interface GateInput {
  qc: QCData;
  optimization?: OptimizationData;
  approvalRate?: number; // User's historical approval rate (0-1)
}

export interface GateOutput {
  gate: GateData;
}

export class GateAgent extends BaseAgent<GateInput, GateOutput> {
  protected name = "Gate";
  protected stage = 8;
  protected usesAI = false;

  protected validate(input: GateInput): { valid: boolean; error?: string } {
    if (!input.qc) {
      return { valid: false, error: "QC data required" };
    }
    return { valid: true };
  }

  protected async execute(input: GateInput, context: AgentContext): Promise<GateOutput> {
    const { qc, optimization, approvalRate = 0.5 } = input;

    this.emitThinking(context, `Анализирую результаты QC (score: ${qc.overallScore}/100)...`);

    const gate = this.makeDecision(qc, optimization, approvalRate);

    // Emit result based on decision
    if (gate.decision === "PASS") {
      this.emitThinking(context, `✅ Решение: PASS. ${gate.reason}`);
    } else if (gate.decision === "NEEDS_REVIEW") {
      this.emitThinking(context, `⚠️ Решение: NEEDS_REVIEW. ${gate.reason}`);
    } else {
      this.emitThinking(context, `❌ Решение: FAIL. ${gate.reason}`);
    }

    return { gate };
  }

  private makeDecision(
    qc: QCData,
    optimization: OptimizationData | undefined,
    approvalRate: number
  ): GateData {
    const finalScore = qc.overallScore;
    const hookScore = qc.hookScore;
    const hasCritical = qc.weakSpots.some((w) => w.severity === "critical");
    const iterations = optimization?.iterationNumber || 0;

    // High confidence PASS
    if (finalScore >= 85 && !hasCritical && hookScore >= 80) {
      return {
        decision: "PASS",
        reason: `Отличный score (${finalScore}), сильный hook (${hookScore}), нет критичных проблем`,
        confidence: 0.95,
        finalScore,
        passedAfterIterations: iterations,
      };
    }

    // Good score + user usually approves these
    if (finalScore >= 75 && !hasCritical && approvalRate > 0.7) {
      return {
        decision: "PASS",
        reason: `Хороший score (${finalScore}), высокий approval rate пользователя (${Math.round(approvalRate * 100)}%)`,
        confidence: 0.80,
        finalScore,
        passedAfterIterations: iterations,
      };
    }

    // Good score but moderate approval rate - let user decide
    if (finalScore >= 75 && !hasCritical) {
      return {
        decision: "NEEDS_REVIEW",
        reason: `Score ${finalScore} выше порога, но есть сомнения. Требуется решение пользователя`,
        confidence: 0.70,
        finalScore,
        passedAfterIterations: iterations,
      };
    }

    // Borderline - let user decide
    if (finalScore >= 70 && !hasCritical) {
      return {
        decision: "NEEDS_REVIEW",
        reason: `Score ${finalScore} пограничный. Рекомендуется ручная проверка`,
        confidence: 0.60,
        finalScore,
        passedAfterIterations: iterations,
      };
    }

    // Has critical issues but decent score - let user decide
    if (finalScore >= 65 && hasCritical) {
      return {
        decision: "NEEDS_REVIEW",
        reason: `Score ${finalScore} нормальный, но есть критичные проблемы. Требуется ручная проверка`,
        confidence: 0.50,
        finalScore,
        passedAfterIterations: iterations,
      };
    }

    // Below threshold or has critical issues with low score
    const reasons: string[] = [];
    if (finalScore < 65) {
      reasons.push(`score ${finalScore} ниже порога 65`);
    }
    if (hasCritical && finalScore < 65) {
      reasons.push("есть критичные проблемы");
    }
    if (hookScore < 50) {
      reasons.push(`слабый hook (${hookScore})`);
    }

    return {
      decision: "FAIL",
      reason: `Не соответствует стандартам: ${reasons.join(", ")}`,
      confidence: 0.90,
      finalScore,
      passedAfterIterations: iterations,
    };
  }
}

export const gateAgent = new GateAgent();
