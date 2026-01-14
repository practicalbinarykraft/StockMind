import { RssSourcesRepo } from "./rss-sources.repo";
import { CreateRssSourceDto, UpdateRssSourceDto } from "./rss-sources.dto";
import { parseRssSource } from "../../lib/rss-background-tasks";
import { logger } from "../../lib/logger";
import type { RssSource } from "@shared/schema";
import { RssSourceNotFoundError } from "./rss-sources.errors";


const rssSourcesRepo = new RssSourcesRepo();

export const rssSourcesService = {
  /**
   * Получить все RSS источники пользователя
   */
  async getRssSources(userId: string): Promise<RssSource[]> {
    const sources = await rssSourcesRepo.getAllByUserId(userId);
    return sources;
  },

  /**
   * Создать новый RSS источник и запустить парсинг
   */
  async createRssSource(userId: string, dto: CreateRssSourceDto): Promise<RssSource> {
    const source = await rssSourcesRepo.create(userId, dto);

    // Запустить парсинг в фоне (не ждем завершения)
    parseRssSource(source.id, source.url, userId).catch((err) =>
      logger.error("Background RSS parsing failed", {
        sourceId: source.id,
        error: err.message,
      })
    );

    return source;
  },

  /**
   * Обновить RSS источник
   */
  async updateRssSource(
    id: string,
    userId: string,
    dto: UpdateRssSourceDto
  ): Promise<RssSource | undefined> {
    const source = await rssSourcesRepo.update(id, userId, dto);
    
    if (!source) {
      throw new RssSourceNotFoundError();
    }

    return source;
  },

  /**
   * Удалить RSS источник
   */
  async deleteRssSource(id: string, userId: string): Promise<void> {
    await rssSourcesRepo.delete(id, userId);
  },

  /**
   * Запустить ручной парсинг RSS источника
   */
  async triggerParsing(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const source = await rssSourcesRepo.getById(id, userId);

    if (!source) {
      throw new RssSourceNotFoundError();
    }

    await rssSourcesRepo.update(id, userId, {
      parseStatus: "parsing",
      parseError: null,
    });

    // Запустить парсинг в фоне (не ждем завершения)
    parseRssSource(source.id, source.url, userId).catch((err) => {
      logger.error("Manual RSS parsing failed", {
        sourceId: source.id,
        error: err.message,
      });
      // Ошибка будет сохранена в parseError функцией parseRssSource
    });

    return {
      success: true,
      message: "Parsing started",
    };
  },
};
