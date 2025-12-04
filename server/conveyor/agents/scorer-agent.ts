/**
 * Scorer Agent (#2)
 * Evaluates viral potential of content
 * Uses AI to score 0-100
 */
import { BaseAIAgent, type AgentContext } from "./base-agent";
import type { SourceData, ScoringData, ScoringBreakdown } from "../types";
import Anthropic from "@anthropic-ai/sdk";

export interface ScorerInput {
  source: SourceData;
  learnedThreshold?: number;
}

export interface ScorerOutput {
  scoring: ScoringData;
  passed: boolean;
}

export class ScorerAgent extends BaseAIAgent<ScorerInput, ScorerOutput> {
  protected name = "Scorer";
  protected stage = 2;
  protected estimatedCost = 0.01;

  protected validate(input: ScorerInput): { valid: boolean; error?: string } {
    if (!input.source) {
      return { valid: false, error: "Source data required" };
    }
    if (!input.source.content || input.source.content.length < 100) {
      return { valid: false, error: "Content too short (min 100 chars)" };
    }
    return { valid: true };
  }

  protected async execute(input: ScorerInput, context: AgentContext): Promise<ScorerOutput> {
    const { source, learnedThreshold } = input;
    const threshold = learnedThreshold || 70;

    // Emit thinking events for real-time display
    this.emitThinking(context, `Анализирую: "${source.title.substring(0, 50)}..."`);

    const client = new Anthropic({ apiKey: context.apiKey });

    const prompt = this.buildPrompt(source);

    this.emitThinking(context, "Оцениваю факты, актуальность и потенциал...");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const scoring = this.parseResponse(content.text);
    const passed = scoring.score >= threshold;

    // Emit result thinking
    if (passed) {
      this.emitThinking(context, `Оценка: ${scoring.score}/100 (${scoring.verdict}) - проходит!`);
    } else {
      this.emitThinking(context, `Оценка: ${scoring.score}/100 - ниже порога ${threshold}`);
    }

    return { scoring, passed };
  }

  private buildPrompt(source: SourceData): string {
    return `Оцени вирусный потенциал контента для короткого видео (60-90 сек).

ЗАГОЛОВОК: ${source.title}

КОНТЕНТ:
${source.content.substring(0, 3000)}

Оцени по критериям:
1. Конкретные факты/цифры (0-35) - есть ли wow-факты, числа, статистика?
2. Актуальность/тренды (0-25) - горячая ли тема, обсуждают ли её сейчас?
3. Широта аудитории (0-20) - сколько людей это заинтересует?
4. Интерес темы (0-20) - захочется ли досмотреть до конца?

Ответь ТОЛЬКО JSON (без markdown):
{
  "score": 78,
  "verdict": "strong",
  "breakdown": {
    "factScore": 30,
    "relevanceScore": 20,
    "audienceScore": 15,
    "interestScore": 13
  },
  "reasoning": "Краткое объяснение оценки на русском"
}

verdict может быть: "viral" (85+), "strong" (70-84), "moderate" (50-69), "weak" (<50)`;
  }

  private parseResponse(text: string): ScoringData {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const data = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      const score = Math.max(0, Math.min(100, data.score || 0));
      const breakdown: ScoringBreakdown = {
        factScore: Math.max(0, Math.min(35, data.breakdown?.factScore || 0)),
        relevanceScore: Math.max(0, Math.min(25, data.breakdown?.relevanceScore || 0)),
        audienceScore: Math.max(0, Math.min(20, data.breakdown?.audienceScore || 0)),
        interestScore: Math.max(0, Math.min(20, data.breakdown?.interestScore || 0)),
      };

      // Determine verdict based on score
      let verdict: ScoringData["verdict"];
      if (score >= 85) verdict = "viral";
      else if (score >= 70) verdict = "strong";
      else if (score >= 50) verdict = "moderate";
      else verdict = "weak";

      return {
        score,
        verdict,
        breakdown,
        reasoning: data.reasoning || "",
      };
    } catch (error) {
      // Return default low score on parse error
      return {
        score: 0,
        verdict: "weak",
        breakdown: {
          factScore: 0,
          relevanceScore: 0,
          audienceScore: 0,
          interestScore: 0,
        },
        reasoning: "Failed to parse AI response",
      };
    }
  }
}

export const scorerAgent = new ScorerAgent();
