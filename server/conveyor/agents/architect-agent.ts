/**
 * Architect Agent (#4)
 * Designs script structure and selects format
 * Uses AI for format selection and hook generation
 */
import { BaseAIAgent, type AgentContext } from "./base-agent";
import type { AnalysisData, ScoringData, ArchitectureData, StructureTemplate, DurationRange, StylePreferences } from "../types";
import Anthropic from "@anthropic-ai/sdk";

export interface ArchitectInput {
  analysis: AnalysisData;
  scoring: ScoringData;
  preferredFormats?: string[];
  // Phase 1: Duration control
  durationRange?: DurationRange;
  stylePreferences?: StylePreferences;
  // Phase 2: Custom prompt
  customPrompt?: string;
}

export interface ArchitectOutput {
  architecture: ArchitectureData;
}

const FORMATS = [
  { id: "hook_story", name: "Hook & Story", desc: "Захват + история" },
  { id: "explainer", name: "Explainer", desc: "Объяснение сложной темы" },
  { id: "news_update", name: "News Update", desc: "Новость дня" },
  { id: "listicle", name: "Top 5 List", desc: "Топ-5 фактов" },
  { id: "hot_take", name: "Hot Take", desc: "Провокационное мнение" },
  { id: "myth_buster", name: "Myth Buster", desc: "Разрушение мифов" },
];

export class ArchitectAgent extends BaseAIAgent<ArchitectInput, ArchitectOutput> {
  protected name = "Architect";
  protected stage = 4;
  protected estimatedCost = 0.01;

  protected validate(input: ArchitectInput): { valid: boolean; error?: string } {
    if (!input.analysis || !input.scoring) {
      return { valid: false, error: "Analysis and scoring data required" };
    }
    return { valid: true };
  }

  protected async execute(input: ArchitectInput, context: AgentContext): Promise<ArchitectOutput> {
    const { analysis, scoring, preferredFormats = [], durationRange, stylePreferences, customPrompt } = input;

    this.emitThinking(context, "Анализирую тему и выбираю оптимальный формат видео...");

    const client = new Anthropic({ apiKey: context.apiKey });
    const prompt = customPrompt
      ? this.buildCustomPrompt(customPrompt, input)
      : this.buildPrompt(analysis, scoring, preferredFormats, durationRange, stylePreferences);

    this.emitThinking(context, `Проектирую структуру для темы: "${analysis.mainTopic.substring(0, 40)}..."`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1536,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const architecture = this.parseResponse(content.text, durationRange);

    this.emitThinking(context, `Выбран формат: "${architecture.formatName}". Длительность: ${architecture.totalDuration}с. Готово!`);

    return { architecture };
  }

  private buildPrompt(
    analysis: AnalysisData,
    scoring: ScoringData,
    preferredFormats: string[],
    durationRange?: DurationRange,
    stylePreferences?: StylePreferences
  ): string {
    const formatsStr = FORMATS.map((f) => `- ${f.id}: ${f.name} (${f.desc})`).join("\n");
    const prefStr = preferredFormats.length > 0
      ? `\nПредпочтительные форматы: ${preferredFormats.join(", ")}`
      : "";

    // Calculate target duration from user preferences
    const minDuration = durationRange?.min || 30;
    const maxDuration = durationRange?.max || 90;
    const targetDuration = Math.round((minDuration + maxDuration) / 2);

    // Duration instruction
    const durationInstruction = `
⏱️ ЦЕЛЕВАЯ ДЛИТЕЛЬНОСТЬ: ${minDuration}-${maxDuration} секунд (оптимально: ${targetDuration}с)
Распредели время между секциями пропорционально.`;

    // Language instruction
    const language = stylePreferences?.language || 'ru';
    const langInstruction = language === 'en'
      ? '\n🌐 Write all hooks and suggestions in ENGLISH.'
      : '\n🌐 Пиши все хуки и предложения на РУССКОМ языке.';

    return `Ты архитектор вирусных видео. Спроектируй структуру.

АНАЛИЗ КОНТЕНТА:
Тема: ${analysis.mainTopic}
Подтемы: ${analysis.subTopics.join(", ")}
Аудитория: ${analysis.targetAudience.join(", ")}
Эмоции: ${analysis.emotionalAngles.join(", ")}
Controversy: ${analysis.controversyLevel}/10
Score: ${scoring.score}
Уникальный угол: ${analysis.uniqueAngle}

ДОСТУПНЫЕ ФОРМАТЫ:
${formatsStr}
${prefStr}
${durationInstruction}
${langInstruction}

Выбери лучший формат и спроектируй структуру.
Ответь ТОЛЬКО JSON (без markdown):
{
  "formatId": "hot_take",
  "formatName": "Hot Take",
  "reasoning": "Почему этот формат лучший для данного контента",
  "suggestedHooks": [
    "Вариант хука 1 (первые 5 сек видео, должен захватить внимание)",
    "Вариант хука 2",
    "Вариант хука 3"
  ],
  "structureTemplate": {
    "hook": { "duration": 5, "purpose": "Захват внимания" },
    "context": { "duration": 10, "purpose": "Контекст темы" },
    "main": { "duration": 35, "purpose": "Основной контент" },
    "twist": { "duration": 10, "purpose": "Неожиданный поворот" },
    "cta": { "duration": 5, "purpose": "Призыв к действию" }
  },
  "totalDuration": ${targetDuration}
}`;
  }

  /**
   * Phase 2: Build prompt from custom template
   */
  private buildCustomPrompt(template: string, input: ArchitectInput): string {
    const { analysis, scoring, durationRange } = input;

    const variables: Record<string, string> = {
      '{{MAIN_TOPIC}}': analysis.mainTopic,
      '{{SUB_TOPICS}}': analysis.subTopics.join(", "),
      '{{TARGET_AUDIENCE}}': analysis.targetAudience.join(", "),
      '{{EMOTIONAL_ANGLES}}': analysis.emotionalAngles.join(", "),
      '{{CONTROVERSY_LEVEL}}': String(analysis.controversyLevel),
      '{{UNIQUE_ANGLE}}': analysis.uniqueAngle,
      '{{SCORE}}': String(scoring.score),
      '{{MIN_DURATION}}': String(durationRange?.min || 30),
      '{{MAX_DURATION}}': String(durationRange?.max || 90),
      '{{FORMATS_LIST}}': FORMATS.map((f) => `- ${f.id}: ${f.name} (${f.desc})`).join("\n"),
    };

    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return prompt;
  }

  private parseResponse(text: string, durationRange?: DurationRange): ArchitectureData {
    // Calculate default duration based on user preferences
    const defaultDuration = durationRange
      ? Math.round((durationRange.min + durationRange.max) / 2)
      : 65;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found");
      }

      const data = JSON.parse(jsonMatch[0]);
      const format = FORMATS.find((f) => f.id === data.formatId) || FORMATS[0];

      const template: StructureTemplate = data.structureTemplate || {
        hook: { duration: 5, purpose: "Захват внимания" },
        context: { duration: 10, purpose: "Контекст" },
        main: { duration: 35, purpose: "Основной контент" },
        twist: { duration: 10, purpose: "Поворот" },
        cta: { duration: 5, purpose: "Призыв" },
      };

      return {
        formatId: format.id,
        formatName: format.name,
        reasoning: data.reasoning || "",
        suggestedHooks: Array.isArray(data.suggestedHooks)
          ? data.suggestedHooks.slice(0, 3)
          : ["Хук по умолчанию"],
        structureTemplate: template,
        totalDuration: data.totalDuration || defaultDuration,
      };
    } catch (error) {
      // Return default structure with user's preferred duration
      return {
        formatId: "hook_story",
        formatName: "Hook & Story",
        reasoning: "Default format due to parse error",
        suggestedHooks: ["Внимание! То, что вы узнаете, изменит ваш взгляд на..."],
        structureTemplate: {
          hook: { duration: 5, purpose: "Захват внимания" },
          context: { duration: 10, purpose: "Контекст" },
          main: { duration: 35, purpose: "Основной контент" },
          twist: { duration: 10, purpose: "Поворот" },
          cta: { duration: 5, purpose: "Призыв" },
        },
        totalDuration: defaultDuration,
      };
    }
  }
}

export const architectAgent = new ArchitectAgent();
