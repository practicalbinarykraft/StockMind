/**
 * Analyst Agent (#3)
 * Deep analysis of topic, audience, and angles
 * Uses AI for content analysis
 */
import { BaseAIAgent, type AgentContext } from "./base-agent";
import type { SourceData, ScoringData, AnalysisData } from "../types";
import Anthropic from "@anthropic-ai/sdk";

export interface AnalystInput {
  source: SourceData;
  scoring: ScoringData;
  avoidedTopics?: string[];
}

export interface AnalystOutput {
  analysis: AnalysisData;
  passed: boolean;
}

export class AnalystAgent extends BaseAIAgent<AnalystInput, AnalystOutput> {
  protected name = "Analyst";
  protected stage = 3;
  protected estimatedCost = 0.015;

  protected validate(input: AnalystInput): { valid: boolean; error?: string } {
    if (!input.source || !input.scoring) {
      return { valid: false, error: "Source and scoring data required" };
    }
    return { valid: true };
  }

  protected async execute(input: AnalystInput, context: AgentContext): Promise<AnalystOutput> {
    const { source, scoring, avoidedTopics = [] } = input;

    this.emitThinking(context, `Анализирую тему: "${source.title.substring(0, 50)}..."`);

    const client = new Anthropic({ apiKey: context.apiKey });
    const prompt = this.buildPrompt(source, scoring);

    this.emitThinking(context, "Определяю ключевые факты и целевую аудиторию...");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const analysis = this.parseResponse(content.text);

    // Check if topic is avoided
    const isAvoided = avoidedTopics.some(
      (topic) => analysis.mainTopic.toLowerCase().includes(topic.toLowerCase())
    );

    // Check if we have enough key facts
    const hasEnoughFacts = analysis.keyFacts.length >= 3;

    const passed = !isAvoided && hasEnoughFacts;

    // Emit result thinking
    if (passed) {
      this.emitThinking(context, `Тема: "${analysis.mainTopic}". Найдено ${analysis.keyFacts.length} ключевых фактов. Проходит!`);
    } else if (isAvoided) {
      this.emitThinking(context, `Тема "${analysis.mainTopic}" в списке избегаемых. Пропускаем.`);
    } else {
      this.emitThinking(context, `Недостаточно фактов (${analysis.keyFacts.length} из 3). Пропускаем.`);
    }

    return { analysis, passed };
  }

  private buildPrompt(source: SourceData, scoring: ScoringData): string {
    return `Проанализируй контент как опытный сценарист вирусных видео.

ЗАГОЛОВОК: ${source.title}

КОНТЕНТ:
${source.content.substring(0, 4000)}

ПРЕДВАРИТЕЛЬНАЯ ОЦЕНКА:
Score: ${scoring.score}, Verdict: ${scoring.verdict}
${scoring.reasoning}

Проанализируй и ответь ТОЛЬКО JSON (без markdown):
{
  "mainTopic": "Главная тема в 1 предложении",
  "subTopics": ["подтема1", "подтема2", "подтема3"],
  "targetAudience": ["целевая группа 1", "целевая группа 2"],
  "emotionalAngles": ["эмоция1", "эмоция2", "эмоция3"],
  "keyFacts": [
    "Ключевой факт 1 для видео",
    "Ключевой факт 2 для видео",
    "Ключевой факт 3 для видео",
    "Ключевой факт 4 для видео",
    "Ключевой факт 5 для видео"
  ],
  "controversyLevel": 7,
  "uniqueAngle": "Уникальный угол подачи, который выделит это видео среди других"
}

controversyLevel: 1-10 (насколько тема провокационная/спорная)`;
  }

  private parseResponse(text: string): AnalysisData {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        mainTopic: data.mainTopic || "Unknown topic",
        subTopics: Array.isArray(data.subTopics) ? data.subTopics.slice(0, 3) : [],
        targetAudience: Array.isArray(data.targetAudience) ? data.targetAudience.slice(0, 3) : [],
        emotionalAngles: Array.isArray(data.emotionalAngles) ? data.emotionalAngles.slice(0, 3) : [],
        keyFacts: Array.isArray(data.keyFacts) ? data.keyFacts.slice(0, 5) : [],
        controversyLevel: Math.max(1, Math.min(10, data.controversyLevel || 5)),
        uniqueAngle: data.uniqueAngle || "",
      };
    } catch (error) {
      return {
        mainTopic: "Parse error",
        subTopics: [],
        targetAudience: [],
        emotionalAngles: [],
        keyFacts: [],
        controversyLevel: 5,
        uniqueAngle: "",
      };
    }
  }
}

export const analystAgent = new AnalystAgent();
