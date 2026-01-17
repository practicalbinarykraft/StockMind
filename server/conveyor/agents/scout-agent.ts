/**
 * Scout Agent (#1)
 * Finds content from RSS/Instagram sources
 * Does NOT use AI - pure filtering logic
 */
import { BaseAgent, type AgentContext } from "./base-agent";
import type { SourceData, ConveyorItemData } from "../types";
import type { ConveyorSettings } from "@shared/schema";
import { newsService } from "../../modules/news/news.service";
import { fetchAndExtract } from "../../lib/fetch-and-extract";

// Minimum content length for scoring (Scorer requires 100 chars)
const MIN_CONTENT_LENGTH = 500;

export interface ScoutInput {
  settings: ConveyorSettings;
}

export interface ScoutOutput {
  items: SourceData[];
  totalFound: number;
  filtered: number;
}

export class ScoutAgent extends BaseAgent<ScoutInput, ScoutOutput> {
  protected name = "Scout";
  protected stage = 1;
  protected usesAI = false;

  protected validate(input: ScoutInput): { valid: boolean; error?: string } {
    if (!input.settings) {
      return { valid: false, error: "Settings required" };
    }
    return { valid: true };
  }

  protected async execute(input: ScoutInput, context: AgentContext): Promise<ScoutOutput> {
    const { settings } = input;
    const sourceTypes = (settings.sourceTypes as string[]) || ["news"];
    const keywords = (settings.keywords as string[]) || [];
    const excludeKeywords = (settings.excludeKeywords as string[]) || [];
    const maxAgeDays = settings.maxAgeDays || 7;

    this.emitThinking(context, "🔍 Скаут начинает сбор исходных данных...");
    this.emitThinking(context, `📋 Настройки: типы источников=[${sourceTypes.join(", ")}], макс. возраст=${maxAgeDays} дней`);

    if (keywords.length > 0) {
      this.emitThinking(context, `🔑 Ключевые слова: ${keywords.join(", ")}`);
    }
    if (excludeKeywords.length > 0) {
      this.emitThinking(context, `🚫 Исключить: ${excludeKeywords.join(", ")}`);
    }

    const items: SourceData[] = [];
    let totalFound = 0;
    let filtered = 0;

    // Process RSS sources
    if (sourceTypes.includes("news")) {
      this.emitThinking(context, "📰 Проверяю RSS источники...");
      const { items: rssItems, debugInfo } = await this.findRssItemsWithDebug(context.userId, settings, context);
      totalFound += rssItems.length;

      // Show debug info
      if (debugInfo.totalItemsInDb === 0) {
        this.emitThinking(context, "⚠️ В базе нет RSS статей. Запустите парсинг RSS лент.");
      } else {
        this.emitThinking(context, `📊 Всего статей в базе: ${debugInfo.totalItemsInDb}`);
        if (debugInfo.filteredBySource > 0) {
          this.emitThinking(context, `  └ Отфильтровано по источникам: ${debugInfo.filteredBySource}`);
        }
        if (debugInfo.alreadyUsed > 0) {
          this.emitThinking(context, `  └ Уже использовано: ${debugInfo.alreadyUsed}`);
        }
        if (debugInfo.dismissed > 0) {
          this.emitThinking(context, `  └ Отклонено пользователем: ${debugInfo.dismissed}`);
        }
        this.emitThinking(context, `  └ Доступно для обработки: ${rssItems.length}`);
      }

      if (rssItems.length === 0) {
        this.emitThinking(context, "⚠️ Нет доступных RSS статей для обработки.");
      } else {
        this.emitThinking(context, `📝 Применяю фильтры к ${rssItems.length} статьям...`);
      }

      for (const item of rssItems) {
        // Apply filters
        const filterResult = this.passesFiltersWithReason(item, keywords, excludeKeywords, maxAgeDays);
        if (!filterResult.passes) {
          filtered++;
          continue;
        }

        // Get content - use fullContent if available, otherwise snippet
        let content = item.fullContent || item.content || "";

        // If content is too short, try to fetch full article
        if (content.length < MIN_CONTENT_LENGTH && item.url) {
          this.emitThinking(context, `📄 Загружаю полный текст статьи: "${item.title.substring(0, 40)}..."`);

          try {
            const result = await fetchAndExtract(item.url);
            if (result.ok && result.content) {
              content = result.content;
              // Save to database for future use
              await newsService.setFullContent(item.id, content);
              this.emitThinking(context, `✅ Загружено ${content.length} символов`);
            } else {
              this.emitThinking(context, `⚠️ Не удалось загрузить статью: ${result.reason || "unknown"}`);
            }
          } catch (err: any) {
            this.emitThinking(context, `⚠️ Ошибка загрузки: ${err.message}`);
          }
        }

        // Skip if content is still too short after fetch attempt
        if (content.length < 100) {
          this.emitThinking(context, `⏭️ Пропускаю "${item.title.substring(0, 30)}..." - контент слишком короткий (${content.length} символов)`);
          filtered++;
          continue;
        }

        items.push({
          type: "news",
          itemId: item.id,
          title: item.title,
          content,
          url: item.url,
          publishedAt: item.publishedAt || new Date(),
          imageUrl: item.imageUrl || undefined,
        });
      }
    }

    // TODO: Add Instagram support when needed
    // if (sourceTypes.includes("instagram")) { ... }

    // Emit final result
    if (items.length === 0) {
      this.emitThinking(context, `❌ Не найдено подходящих материалов. Всего: ${totalFound}, отфильтровано: ${filtered}`);
    } else {
      this.emitThinking(context, `✅ Найдено ${items.length} подходящих материалов для обработки`);
    }

    return {
      items,
      totalFound,
      filtered,
    };
  }

  /**
   * Find RSS items with detailed debug info
   */
  private async findRssItemsWithDebug(
    userId: string,
    settings: ConveyorSettings,
    context: AgentContext
  ): Promise<{
    items: any[];
    debugInfo: {
      totalItemsInDb: number;
      filteredBySource: number;
      alreadyUsed: number;
      dismissed: number;
    };
  }> {
    const allItems = await newsService.getRssItems(userId);
    const sourceIds = settings.sourceIds as string[] | null;

    const debugInfo = {
      totalItemsInDb: allItems.length,
      filteredBySource: 0,
      alreadyUsed: 0,
      dismissed: 0,
    };

    const filteredItems = allItems.filter((item) => {
      // Filter by source if specified
      if (sourceIds && sourceIds.length > 0) {
        if (!sourceIds.includes(item.sourceId)) {
          debugInfo.filteredBySource++;
          return false;
        }
      }

      // Skip if already used in project
      if (item.usedInProject) {
        debugInfo.alreadyUsed++;
        return false;
      }

      // Skip if dismissed
      if (item.userAction === "dismissed") {
        debugInfo.dismissed++;
        return false;
      }

      return true;
    });

    return { items: filteredItems, debugInfo };
  }

  /**
   * Check if item passes filters and return reason if not
   */
  private passesFiltersWithReason(
    item: any,
    keywords: string[],
    excludeKeywords: string[],
    maxAgeDays: number
  ): { passes: boolean; reason?: string } {
    const content = `${item.title || ""} ${item.content || ""}`.toLowerCase();

    // Check keywords (must contain at least one if specified)
    if (keywords.length > 0) {
      const hasKeyword = keywords.some((kw) =>
        content.includes(kw.toLowerCase())
      );
      if (!hasKeyword) {
        return { passes: false, reason: "no_keyword" };
      }
    }

    // Check exclude keywords
    if (excludeKeywords.length > 0) {
      const hasExcluded = excludeKeywords.some((kw) =>
        content.includes(kw.toLowerCase())
      );
      if (hasExcluded) {
        return { passes: false, reason: "excluded_keyword" };
      }
    }

    // Check age
    if (item.publishedAt) {
      const ageMs = Date.now() - new Date(item.publishedAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays) {
        return { passes: false, reason: "too_old" };
      }
    }

    // Note: Content length check removed - we now fetch full article if needed
    // Content length is checked after fetch attempt in execute()

    return { passes: true };
  }
}

export const scoutAgent = new ScoutAgent();
