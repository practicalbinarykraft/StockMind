/**
 * Feedback Processor Agent
 * Uses Claude to extract patterns and rules from user feedback
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";
import {
  userWritingProfileStorage,
  userFeedbackEntriesStorage,
  autoScriptVersionsStorage,
} from "../storage/user-writing-profile.storage";
import { autoScriptsStorage } from "../storage/auto-scripts.storage";
import type { ExtractedPatterns, WritingRule, UserWritingProfile } from "@shared/schema";

const EXTRACTION_PROMPT = `Ты - эксперт по анализу обратной связи на сценарии для коротких видео.

Проанализируй рецензию пользователя и извлеки конкретные паттерны и правила.

ВАЖНО: Извлекай КОНКРЕТНЫЕ вещи, которые пользователь упоминает, а не общие категории.

Примеры хорошего извлечения:
- Рецензия: "Убери клише типа СТОП! и А вы знали?"
  → avoid: ["фраза 'СТОП!'", "фраза 'А вы знали?'"]

- Рецензия: "Слишком много риторических вопросов"
  → avoid: ["чрезмерное использование риторических вопросов"]
  → rules: [{ type: "avoid", rule: "Не используй больше 2 риторических вопросов на сценарий", weight: 4 }]

- Рецензия: "Начало скучное, нужен провокационный хук"
  → prefer: ["провокационное начало", "сильный хук"]
  → rules: [{ type: "always", rule: "Начинай с провокации или неожиданного заявления", weight: 5 }]

РЕЦЕНЗИЯ ПОЛЬЗОВАТЕЛЯ:
{feedback}

ОРИГИНАЛЬНЫЙ СЦЕНАРИЙ (для контекста):
{script}

Верни JSON в формате:
{
  "avoid": ["конкретная фраза или паттерн 1", "конкретная фраза или паттерн 2"],
  "prefer": ["что пользователь хочет видеть 1", "что пользователь хочет видеть 2"],
  "rules": [
    {
      "type": "never" | "always" | "prefer" | "avoid",
      "rule": "Конкретная инструкция для AI",
      "weight": 1-5,
      "examples": ["пример из рецензии, если есть"]
    }
  ]
}

Правила извлечения:
1. weight: 5 = критически важно для пользователя, 1 = мелкое замечание
2. type: "never" - абсолютный запрет, "always" - обязательное требование, "prefer/avoid" - рекомендация
3. Если пользователь приводит примеры - сохраняй их в examples
4. Извлекай ТОЛЬКО то, что явно следует из рецензии`;

const SUMMARY_PROMPT = `Ты - эксперт по стилистике текстов для коротких видео.

На основе собранных данных о предпочтениях пользователя создай краткое резюме его стиля.

ИЗБЕГАТЬ (avoid_patterns):
{avoidPatterns}

ПРЕДПОЧИТАТЬ (prefer_patterns):
{preferPatterns}

ПРАВИЛА (writing_rules):
{writingRules}

ИСТОРИЯ РЕЦЕНЗИЙ (последние 10):
{recentFeedback}

Создай краткое резюме (2-4 абзаца) в формате:

СТИЛЬ ПОЛЬЗОВАТЕЛЯ
=================

[Общее описание предпочитаемого стиля в 1-2 предложениях]

ЧТО НРАВИТСЯ:
• [пункт 1]
• [пункт 2]
...

ЧТО НЕ НРАВИТСЯ:
• [пункт 1]
• [пункт 2]
...

КЛЮЧЕВЫЕ ПРАВИЛА:
• [самое важное правило 1]
• [самое важное правило 2]
• [самое важное правило 3]

КРАТКАЯ ИНСТРУКЦИЯ ДЛЯ AI:
[1-2 предложения, которые можно вставить в промпт для генерации сценария]`;

export class FeedbackProcessor {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Process a single feedback entry and extract patterns
   */
  async processFeedback(
    feedbackId: string,
    feedbackText: string,
    originalScript: string
  ): Promise<ExtractedPatterns | null> {
    try {
      const prompt = EXTRACTION_PROMPT
        .replace("{feedback}", feedbackText)
        .replace("{script}", originalScript.slice(0, 2000));

      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn("[FeedbackProcessor] No JSON found in response");
        return null;
      }

      const extracted: ExtractedPatterns = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!Array.isArray(extracted.avoid)) extracted.avoid = [];
      if (!Array.isArray(extracted.prefer)) extracted.prefer = [];
      if (!Array.isArray(extracted.rules)) extracted.rules = [];

      logger.info("[FeedbackProcessor] Extracted patterns", {
        feedbackId,
        avoidCount: extracted.avoid.length,
        preferCount: extracted.prefer.length,
        rulesCount: extracted.rules.length,
      });

      return extracted;
    } catch (error: any) {
      logger.error("[FeedbackProcessor] Failed to process feedback", {
        feedbackId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Apply extracted patterns to user's writing profile
   */
  async applyToProfile(
    userId: string,
    patterns: ExtractedPatterns
  ): Promise<void> {
    const profile = await userWritingProfileStorage.getOrCreate(userId);

    // Add avoid patterns
    for (const pattern of patterns.avoid) {
      if (pattern && pattern.trim()) {
        await userWritingProfileStorage.addAvoidPattern(userId, pattern.trim());
      }
    }

    // Add prefer patterns
    for (const pattern of patterns.prefer) {
      if (pattern && pattern.trim()) {
        await userWritingProfileStorage.addPreferPattern(userId, pattern.trim());
      }
    }

    // Add writing rules
    for (const rule of patterns.rules) {
      if (rule.rule && rule.rule.trim()) {
        await userWritingProfileStorage.addWritingRule(userId, {
          ...rule,
          sourceCount: 1,
        });
      }
    }

    logger.info("[FeedbackProcessor] Applied patterns to profile", {
      userId,
      patternsApplied: patterns.avoid.length + patterns.prefer.length + patterns.rules.length,
    });
  }

  /**
   * Process all unprocessed feedback for a user
   */
  async processUserFeedback(userId: string): Promise<number> {
    const unprocessed = await userFeedbackEntriesStorage.getUnprocessed(userId);

    if (unprocessed.length === 0) {
      return 0;
    }

    let processed = 0;

    for (const entry of unprocessed) {
      const patterns = await this.processFeedback(
        entry.id,
        entry.feedbackText,
        entry.originalScript || ""
      );

      if (patterns) {
        await this.applyToProfile(userId, patterns);
        await userFeedbackEntriesStorage.markProcessed(entry.id, patterns);
        processed++;
      }
    }

    // Regenerate AI summary after processing
    if (processed > 0) {
      await this.regenerateSummary(userId);
    }

    return processed;
  }

  /**
   * Generate AI summary of user's writing preferences
   */
  async regenerateSummary(userId: string): Promise<string | null> {
    try {
      const profile = await userWritingProfileStorage.getByUserId(userId);
      if (!profile) return null;

      const recentFeedback = await userFeedbackEntriesStorage.getByUser(userId, 10);

      const avoidPatterns = (profile.avoidPatterns as string[]) || [];
      const preferPatterns = (profile.preferPatterns as string[]) || [];
      const writingRules = (profile.writingRules as WritingRule[]) || [];

      // Skip if not enough data
      if (avoidPatterns.length === 0 && preferPatterns.length === 0 && writingRules.length === 0) {
        return null;
      }

      const prompt = SUMMARY_PROMPT
        .replace("{avoidPatterns}", avoidPatterns.join("\n• ") || "Нет данных")
        .replace("{preferPatterns}", preferPatterns.join("\n• ") || "Нет данных")
        .replace(
          "{writingRules}",
          writingRules.map((r) => `[${r.type}] ${r.rule} (вес: ${r.weight})`).join("\n• ") || "Нет данных"
        )
        .replace(
          "{recentFeedback}",
          recentFeedback.map((f) => `- ${f.feedbackText.slice(0, 200)}`).join("\n") || "Нет данных"
        );

      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const summary = response.content[0].type === "text" ? response.content[0].text : "";

      await userWritingProfileStorage.updateAiSummary(userId, summary);

      logger.info("[FeedbackProcessor] Generated AI summary", { userId });

      return summary;
    } catch (error: any) {
      logger.error("[FeedbackProcessor] Failed to generate summary", {
        userId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get user's writing profile for prompt injection
   */
  async getWriterContext(userId: string): Promise<{
    instructions: string[];
    avoidPatterns: string[];
    preferPatterns: string[];
    aiSummary: string | null;
  }> {
    const profile = await userWritingProfileStorage.getByUserId(userId);

    if (!profile) {
      return {
        instructions: [],
        avoidPatterns: [],
        preferPatterns: [],
        aiSummary: null,
      };
    }

    const rules = (profile.writingRules as WritingRule[]) || [];

    // Convert rules to instructions
    const instructions: string[] = [];
    for (const rule of rules) {
      const prefix = {
        never: "НИКОГДА НЕ",
        always: "ВСЕГДА",
        prefer: "Предпочтительно",
        avoid: "Избегай",
      }[rule.type];

      instructions.push(`${prefix}: ${rule.rule}`);
    }

    return {
      instructions,
      avoidPatterns: (profile.avoidPatterns as string[]) || [],
      preferPatterns: (profile.preferPatterns as string[]) || [],
      aiSummary: profile.aiSummary,
    };
  }
}

// Factory function to create processor with API key
export function createFeedbackProcessor(apiKey: string): FeedbackProcessor {
  return new FeedbackProcessor(apiKey);
}
