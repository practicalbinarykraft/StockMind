import { InstagramSourcesRepo } from "./instagram-sources.repo";
import { CreateInstagramSourceDto, UpdateInstagramSourceDto, ParseInstagramSourceDto } from "./instagram-sources.dto";
import {
  InstagramSourceNotFoundError,
  ApifyKeyNotConfiguredError,
  InvalidApifyKeyError,
  InstagramParseError,
} from "./instagram-sources.errors";
import { scrapeInstagramReels, testApifyApiKey } from "../../services/apify-service";
import { downloadInstagramMediaBackground, getProcessingQueue } from "../../lib/instagram-background-tasks";
import { logger } from "../../lib/logger";
import { normalizeInstagramUsername } from "../../utils/route-helpers";
import { checkSourceForUpdates } from "../../cron/instagram-monitor";
import type { InstagramSource } from "@shared/schema";
import { apiKeysService } from "../api-keys/api-keys.service";
import { instagramItemsService } from "../instagram-items/instagram-items.service";


const instagramSourcesRepo = new InstagramSourcesRepo();

// Константы лимитов парсинга
export const INSTAGRAM_LIMITS = {
  AUTO_PARSE_ON_ADD: 10,
  CHECK_NOW: 20,
  MAX_AUTO_SCORE: 10,
};

export const instagramSourcesService = {
  /**
   * Получить все Instagram источники пользователя
   */
  async getInstagramSources(userId: string): Promise<InstagramSource[]> {
    const sources = await instagramSourcesRepo.getAllByUserId(userId);
    return sources;
  },

  /**
   * Создать новый Instagram источник и запустить автопарсинг
   */
  async createInstagramSource(userId: string, dto: CreateInstagramSourceDto): Promise<InstagramSource> {
    const normalizedUsername = normalizeInstagramUsername(dto.username);
    const normalizedDto = { ...dto, username: normalizedUsername };

    const source = await instagramSourcesRepo.create(userId, normalizedDto);

    const apifyKey = await apiKeysService.getUserApiKey(userId, "apify");

    if (apifyKey) {
      await instagramSourcesRepo.update(source.id, userId, {
        parseStatus: "parsing",
        parseError: null,
      });

      // Обновить объект source для ответа
      source.parseStatus = "parsing";
      source.parseError = null;

      // Запустить автопарсинг в фоне
      this.autoParseNewSource(source, userId, apifyKey.decryptedKey);
    }

    return source;
  },

  /**
   * Автопарсинг нового источника (в фоне)
   */
  async autoParseNewSource(source: InstagramSource, userId: string, apifyKey: string): Promise<void> {
    try {
      logger.info("Auto-parsing new Instagram source", {
        sourceId: source.id,
        username: source.username,
        limit: INSTAGRAM_LIMITS.AUTO_PARSE_ON_ADD,
      });

      const result = await scrapeInstagramReels(
        source.username,
        apifyKey,
        INSTAGRAM_LIMITS.AUTO_PARSE_ON_ADD
      );

      if (result.success) {
        const { savedCount, skippedCount, latestReel } = await this.saveReelsToDatabase(
          result.items,
          source.id,
          userId
        );

        await instagramSourcesRepo.update(source.id, userId, {
          parseStatus: "success",
          lastParsed: new Date(),
          itemCount: savedCount,
          parseError: null,
          lastScrapedDate: latestReel?.timestamp ? new Date(latestReel.timestamp) : new Date(),
          lastScrapedReelId: latestReel?.id || null,
        });

        logger.info("Auto-parse completed", {
          sourceId: source.id,
          username: source.username,
          savedCount,
          skippedCount,
        });
      } else {
        await instagramSourcesRepo.update(source.id, userId, {
          parseStatus: "error",
          parseError: result.error || "Auto-parse failed",
        });

        logger.error("Auto-parse failed", {
          sourceId: source.id,
          username: source.username,
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error("Error in auto-parse", {
        sourceId: source.id,
        error: error.message,
      });

      await instagramSourcesRepo
        .update(source.id, userId, {
          parseStatus: "error",
          parseError: error.message || "Auto-parse error",
        })
        .catch((err) => logger.error("Failed to update error status", { error: err.message }));
    }
  },

  /**
   * Обновить Instagram источник
   */
  async updateInstagramSource(
    id: string,
    userId: string,
    dto: UpdateInstagramSourceDto
  ): Promise<InstagramSource> {
    const source = await instagramSourcesRepo.update(id, userId, dto);

    if (!source) {
      throw new InstagramSourceNotFoundError();
    }

    return source;
  },

  /**
   * Удалить Instagram источник
   */
  async deleteInstagramSource(id: string, userId: string): Promise<void> {
    await instagramSourcesRepo.delete(id, userId);
  },

  /**
   * Запустить ручной парсинг Instagram источника
   */
  async parseInstagramSource(
    id: string,
    userId: string,
    dto: ParseInstagramSourceDto
  ): Promise<{ success: boolean; itemCount?: number; savedCount?: number; skippedCount?: number; message?: string }> {
    const source = await instagramSourcesRepo.getById(id, userId);

    if (!source) {
      throw new InstagramSourceNotFoundError();
    }

    const apifyKey = await apiKeysService.getUserApiKey(userId, "apify");

    if (!apifyKey) {
      throw new ApifyKeyNotConfiguredError();
    }

    // Проверить валидность ключа
    logger.debug("Testing Apify API key before scraping");
    const isValidKey = await testApifyApiKey(apifyKey.decryptedKey);

    if (!isValidKey) {
      throw new InvalidApifyKeyError();
    }

    // Обновить статус на 'parsing'
    await instagramSourcesRepo.update(id, userId, {
      parseStatus: "parsing",
      parseError: null,
    });

    logger.info("Starting Instagram parse", {
      username: source.username,
      resultsLimit: dto.resultsLimit,
    });

    // Запустить парсинг
    const result = await scrapeInstagramReels(
      source.username,
      apifyKey.decryptedKey,
      dto.resultsLimit || 30
    );

    if (result.success) {
      logger.info("Successfully parsed Instagram Reels", {
        username: source.username,
        itemCount: result.itemCount,
      });

      const { savedCount, skippedCount, latestReel } = await this.saveReelsToDatabase(
        result.items,
        id,
        userId
      );

      logger.info("Instagram parse completed", { savedCount, skippedCount });

      // Обновить источник со статусом успеха
      await instagramSourcesRepo.update(id, userId, {
        parseStatus: "success",
        lastParsed: new Date(),
        itemCount: result.itemCount,
        parseError: null,
        lastScrapedDate: latestReel?.timestamp ? new Date(latestReel.timestamp) : new Date(),
        lastScrapedReelId: latestReel?.id || null,
      });

      return {
        success: true,
        itemCount: result.itemCount,
        savedCount,
        skippedCount,
      };
    } else {
      await instagramSourcesRepo.update(id, userId, {
        parseStatus: "error",
        parseError: result.error || "Unknown error",
      });

      throw new InstagramParseError(result.error || "Failed to scrape Instagram Reels");
    }
  },

  /**
   * Проверить источник на новые рилсы (Check Now)
   */
  async checkNow(
    id: string,
    userId: string
  ): Promise<{ success: boolean; newReelsCount: number; viralReelsCount: number; message: string }> {
    const source = await instagramSourcesRepo.getById(id, userId);

    if (!source) {
      throw new InstagramSourceNotFoundError();
    }

    const apifyKey = await apiKeysService.getUserApiKey(userId, "apify");

    if (!apifyKey) {
      throw new ApifyKeyNotConfiguredError();
    }

    logger.info("Manual check initiated", { username: source.username, userId });

    const result = await checkSourceForUpdates(source);

    logger.info("Manual check completed", {
      username: source.username,
      newReelsCount: result.newReelsCount,
      viralReelsCount: result.viralReelsCount,
    });

    return {
      success: true,
      newReelsCount: result.newReelsCount,
      viralReelsCount: result.viralReelsCount,
      message:
        result.newReelsCount > 0
          ? `Found ${result.newReelsCount} new Reels${result.viralReelsCount > 0 ? ` (${result.viralReelsCount} viral)` : ""}`
          : "No new Reels found",
    };
  },

  /**
   * Получить лимиты парсинга и статистику очереди
   */
  async getLimits(): Promise<{
    limits: { autoParseOnAdd: number; checkNow: number; maxAutoScore: number };
    queue: any;
  }> {
    const queueStats = getProcessingQueue().getStats();

    return {
      limits: {
        autoParseOnAdd: INSTAGRAM_LIMITS.AUTO_PARSE_ON_ADD,
        checkNow: INSTAGRAM_LIMITS.CHECK_NOW,
        maxAutoScore: INSTAGRAM_LIMITS.MAX_AUTO_SCORE,
      },
      queue: queueStats,
    };
  },

  /**
   * Сохранить рилсы в базу данных (вспомогательный метод)
   */
  async saveReelsToDatabase(
    reels: any[],
    sourceId: string,
    userId: string
  ): Promise<{ savedCount: number; skippedCount: number; latestReel: any }> {
    let savedCount = 0;
    let skippedCount = 0;

    for (const reel of reels) {
      try {
        const item = await instagramItemsService.createInstagramItem({
          sourceId,
          userId,
          externalId: reel.shortCode,
          shortCode: reel.shortCode,
          caption: reel.caption || null,
          url: reel.url,
          videoUrl: reel.videoUrl,
          thumbnailUrl: reel.thumbnailUrl || null,
          videoDuration: reel.videoDuration || null,
          likesCount: reel.likesCount,
          commentsCount: reel.commentsCount,
          videoViewCount: reel.videoViewCount || null,
          videoPlayCount: reel.videoPlayCount || null,
          sharesCount: reel.sharesCount || null,
          hashtags: reel.hashtags || [],
          mentions: reel.mentions || [],
          ownerUsername: reel.ownerUsername || null,
          ownerFullName: reel.ownerFullName || null,
          ownerId: reel.ownerId || null,
          musicInfo: reel.musicInfo || null,
          aiScore: null,
          aiComment: null,
          userAction: null,
          actionAt: null,
          usedInProject: null,
          freshnessScore: null,
          viralityScore: null,
          qualityScore: null,
          publishedAt: reel.timestamp ? new Date(reel.timestamp) : null,
          downloadStatus: "pending",
        });

        savedCount++;

        // Скачать видео в фоне (передать sourceId для отслеживания лимита скоринга)
        downloadInstagramMediaBackground(
          item.id,
          reel.videoUrl,
          reel.thumbnailUrl || null,
          userId,
          sourceId
        );
      } catch (error: any) {
        if (
          error.code === "23505" ||
          error.message?.includes("duplicate") ||
          error.message?.includes("unique")
        ) {
          logger.debug("Skipping duplicate Reel", { shortCode: reel.shortCode });
          skippedCount++;
        } else {
          logger.error("Error saving Reel", {
            shortCode: reel.shortCode,
            error: error.message,
          });
        }
      }
    }

    // Найти самый свежий рилс
    const latestReel = reels.reduce((latest, current) => {
      if (!current.timestamp) return latest;
      if (!latest || !latest.timestamp) return current;
      return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
    }, reels[0]);

    return { savedCount, skippedCount, latestReel };
  },
};
