/**
 * Generation Pipeline — Main Orchestrator
 * Thin class delegating to specialized modules
 */
import { scriptwriterAgent, editorAgent } from "./../agents";
import { generationSSE } from "./../generation-sse";
import { conveyorSettingsService } from "../../conveyor-settings/conveyor-settings.service";
import type {
  PipelineSettings,
  GenerationResult,
} from "./generation-pipeline.types";
import {
  activeGenerations,
  getApiKey,
  getNewsById,
  getStats,
} from "./generation-pipeline.types";
import { createAutoScript } from "./generation-pipeline.repo";
import { runIterations } from "./generation-pipeline.iterations";
import { regenerateScript } from "./generation-pipeline.regeneration";
import {
  getNewsForGeneration,
  parseAllUserSources,
} from "./generation-pipeline.news";

class GenerationPipeline {
  async runBatch(
    userId: string,
    newsIds: string[],
    settings: PipelineSettings,
  ): Promise<void> {
    console.log(
      `[Pipeline] Запуск batch генерации для ${newsIds.length} новостей`,
    );

    const apiKey = await getApiKey(userId);
    if (!apiKey) throw new Error("API ключ Anthropic не настроен");

    scriptwriterAgent.setApiKey(apiKey);
    editorAgent.setApiKey(apiKey);
    generationSSE.setRunning(userId, true);
    await this.refreshUserStats(userId);

    try {
      for (let i = 0; i < newsIds.length; i++) {
        const newsId = newsIds[i];
        console.log(
          `[Pipeline] ===== Итерация ${i + 1}/${newsIds.length} =====`,
        );

        if (!newsId || typeof newsId !== "string") {
          console.warn(`[Pipeline] Пропущен невалидный newsId:`, newsId);
          continue;
        }

        if (!generationSSE.isRunning(userId)) {
          console.log(`[Pipeline] Генерация остановлена пользователем`);
          break;
        }

        const conveyorSettings =
          await conveyorSettingsService.getSettings(userId);
        if (!conveyorSettings) {
          console.error(
            `[Pipeline] Не удалось получить настройки конвейера для userId: ${userId}`,
          );
          break;
        }

        if (
          conveyorSettings.itemsProcessedToday >= conveyorSettings.dailyLimit
        ) {
          console.log(
            `[Pipeline] Достигнут дневной лимит (${conveyorSettings.dailyLimit} сценариев)`,
          );
          generationSSE.sendEvent(userId, {
            type: "limit_reached",
            data: {
              message: `Достигнут дневной лимит (${conveyorSettings.dailyLimit} сценариев)`,
              processed: conveyorSettings.itemsProcessedToday,
              limit: conveyorSettings.dailyLimit,
            },
          });
          break;
        }

        try {
          console.log(`[Pipeline] Обработка новости ${newsId}`);
          await this.runSingle(userId, newsId, settings);
          console.log(
            `[Pipeline] Обработка новости ${newsId} завершена успешно`,
          );
        } catch (error: any) {
          console.error(
            `[Pipeline] Ошибка генерации для newsId ${newsId}:`,
            error.message,
          );
          if (error.message?.includes("уже создан")) {
            generationSSE.sendEvent(userId, {
              type: "script_skipped",
              data: {
                newsId,
                reason: "Сценарий для этой новости уже существует",
              },
            });
          } else {
            generationSSE.sendEvent(userId, {
              type: "script_error",
              data: { newsId, error: error.message },
            });
          }
        }
      }
    } finally {
      generationSSE.setRunning(userId, false);
      await this.refreshUserStats(userId);
      console.log(`[Pipeline] Batch генерация завершена`);
    }
  }

  async runSingle(
    userId: string,
    newsId: string,
    settings: PipelineSettings,
  ): Promise<GenerationResult> {
    console.log(
      `[Pipeline] Генерация для newsId: ${newsId}, userId: ${userId}`,
    );

    try {
      const news = await getNewsById(newsId);
      if (!news) throw new Error(`Новость с ID ${newsId} не найдена`);

      console.log(`[Pipeline] Новость найдена: ${news.title}`);
      const autoScript = await createAutoScript(userId, news);
      if (!autoScript?.id) throw new Error("Failed to create autoScript");

      const scriptId = autoScript.id;
      console.log(`[Pipeline] AutoScript создан с ID: ${scriptId}`);

      const abortController = new AbortController();
      activeGenerations.set(scriptId, { userId, abortController });

      try {
        const refreshStats = () => this.refreshUserStats(userId);
        return await runIterations(
          userId,
          scriptId,
          news,
          settings,
          refreshStats,
        );
      } finally {
        activeGenerations.delete(scriptId);
      }
    } catch (error: any) {
      console.error(`[Pipeline] Ошибка в runSingle:`, error);
      return { success: false, error: error.message };
    }
  }

  async regenerateScript(
    userId: string,
    scriptId: string,
    customPrompt?: string,
  ): Promise<GenerationResult> {
    const result = await regenerateScript(userId, scriptId, customPrompt);
    await this.refreshUserStats(userId);
    return result;
  }

  stop(userId: string): void {
    generationSSE.setRunning(userId, false);
    console.log(`[Pipeline] Генерация остановлена для userId: ${userId}`);
  }

  isRunning(userId: string): boolean {
    return generationSSE.isRunning(userId);
  }

  async refreshUserStats(userId: string): Promise<void> {
    const stats = await this.getStats(userId);
    generationSSE.refreshStatsFromDB(userId, stats);
  }

  async getStats(userId: string) {
    return getStats(userId);
  }

  async getNewsForGeneration(
    userId: string,
    limit?: number,
    maxAgeDays?: number,
    autoParseIfNeeded?: boolean,
    minScoreThreshold?: number,
  ) {
    return getNewsForGeneration(
      userId,
      limit,
      maxAgeDays,
      autoParseIfNeeded,
      minScoreThreshold,
    );
  }

  async parseAllUserSources(userId: string) {
    return parseAllUserSources(userId);
  }
}

export const generationPipeline = new GenerationPipeline();
