import { InstagramItemsRepo } from "./instagram-items.repo";
import { GetInstagramItemsQueryDto, UpdateItemActionDto, ProxyImageQueryDto, CreateInstagramItemDto } from "./instagram-items.dto";
import {
  InstagramItemNotFoundError,
  InvalidActionError,
  VideoNotDownloadedError,
  TranscriptionNotCompletedError,
  InvalidProxyUrlError,
  ProxyImageFetchError,
} from "./instagram-items.errors";
import { scoreInstagramReel } from "../../ai-services";
import { transcribeInstagramItemBackground } from "../../routes/helpers/background-tasks";
import { logger } from "../../lib/logger";
import type { InstagramItem } from "@shared/schema";
import { apiKeysService } from "../api-keys/api-keys.service";

const instagramItemsRepo = new InstagramItemsRepo();

export const instagramItemsService = {

  async createInstagramItem(dto: CreateInstagramItemDto) {
    const item = await instagramItemsRepo.create(dto);
    return item;
  },


  /**
   * Получить все Instagram items пользователя
   */
  async getInstagramItems(userId: string, dto: GetInstagramItemsQueryDto): Promise<InstagramItem[]> {
    // Получить items из БД с учетом sourceId
    const items = dto.sourceId
      ? await instagramItemsRepo.getAllByUserIdAndSourceId(userId, dto.sourceId)
      : await instagramItemsRepo.getAllByUserId(userId);

    // Сортировка: сначала с AI score, потом по дате
    const sortedItems = items.sort((a, b) => {
      if (a.aiScore === null && b.aiScore === null) {
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate;
      }
      if (a.aiScore === null) return 1;
      if (b.aiScore === null) return -1;
      if (b.aiScore !== a.aiScore) return b.aiScore - a.aiScore;
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    }); // to do вынести в utils

    return sortedItems;
  },

  /**
   * Получить конкретный Instagram item по ID
   */
  async getInstagramItemById(id: string, userId: string): Promise<InstagramItem> {
    const item = await instagramItemsRepo.getById(id, userId);

    if (!item) {
      throw new InstagramItemNotFoundError();
    }

    return item;
  },

  /**
   * Обновить действие пользователя (action)
   */
  async updateItemAction(
    id: string,
    userId: string,
    dto: UpdateItemActionDto
  ): Promise<InstagramItem> {
    // Валидация action
    if (!["selected", "dismissed", "seen"].includes(dto.action)) {
      throw new InvalidActionError();
    }

    // Проверить существование item
    const item = await instagramItemsRepo.getById(id, userId);

    if (!item) {
      throw new InstagramItemNotFoundError();
    }

    // Обновить action
    const updated = await instagramItemsRepo.update(id, {
      userAction: dto.action,
      actionAt: new Date(),
      usedInProject: dto.projectId || null,
    });

    if (!updated) {
      throw new InstagramItemNotFoundError();
    }

    return updated;
  },

  /**
   * Запустить транскрипцию видео
   */
  async transcribeItem(
    id: string,
    userId: string
  ): Promise<{ message: string; status: string }> {
    // Получить item и проверить владельца
    const item = await instagramItemsRepo.getById(id, userId);

    if (!item) {
      throw new InstagramItemNotFoundError();
    }

    // Проверить что видео скачано
    if (!item.localVideoPath || item.downloadStatus !== "completed") {
      throw new VideoNotDownloadedError(item.downloadStatus || undefined);
    }

    // Обновить статус на 'processing'
    await instagramItemsRepo.update(id, {
      transcriptionStatus: "processing",
    });

    // Запустить транскрипцию в фоне (не блокирующая операция)
    transcribeInstagramItemBackground(id, item.localVideoPath, userId);

    return {
      message: "Transcription started",
      status: "processing",
    };
  },

  /**
   * Оценить Instagram Reel с помощью AI
   */
  async scoreItem(
    id: string,
    userId: string
  ): Promise<{
    message: string;
    score: number;
    comment: string;
    freshnessScore?: number;
    viralityScore?: number;
    qualityScore?: number;
  }> {
    // Получить item и проверить владельца
    const item = await instagramItemsRepo.getById(id, userId);

    if (!item) {
      throw new InstagramItemNotFoundError();
    }

    // Проверить что транскрипция завершена
    if (!item.transcriptionText || item.transcriptionStatus !== "completed") {
      throw new TranscriptionNotCompletedError(item.transcriptionStatus || undefined);
    }

    // Получить Anthropic API ключ
    const apiKeyRecord = await apiKeysService.getUserApiKey(userId, "anthropic");

    const apiKey = apiKeyRecord.decryptedKey;

    // Оценить Reel
    const result = await scoreInstagramReel(apiKey, item.transcriptionText, item.caption, {
      likes: item.likesCount,
      comments: item.commentsCount,
      views: item.videoViewCount,
    });

    // Подготовить данные для обновления
    const updateData: Partial<InstagramItem> = {
      aiScore: result.score,
      aiComment: result.comment,
    };
    if (typeof result.freshnessScore === "number") updateData.freshnessScore = result.freshnessScore;
    if (typeof result.viralityScore === "number") updateData.viralityScore = result.viralityScore;
    if (typeof result.qualityScore === "number") updateData.qualityScore = result.qualityScore;

    // Обновить item с AI оценками
    await instagramItemsRepo.update(id, updateData);

    return {
      message: "AI scoring completed",
      score: result.score,
      comment: result.comment,
      freshnessScore: result.freshnessScore,
      viralityScore: result.viralityScore,
      qualityScore: result.qualityScore,
    };
  },

  /**
   * Обновить статус скачивания (для background tasks)
   */
  async updateDownloadStatus(
    id: string,
    status: "pending" | "downloading" | "completed" | "failed",
    localVideoPath?: string,
    localThumbnailPath?: string,
    downloadError?: string
  ): Promise<InstagramItem | undefined> {
    const updateData: Partial<InstagramItem> = { downloadStatus: status };
    if (localVideoPath !== undefined) updateData.localVideoPath = localVideoPath;
    if (localThumbnailPath !== undefined) updateData.localThumbnailPath = localThumbnailPath;
    if (downloadError !== undefined) updateData.downloadError = downloadError;

    return await instagramItemsRepo.update(id, updateData);
  },

  /**
   * Обновить транскрипцию (для background tasks)
   */
  async updateTranscription(
    id: string,
    status: "pending" | "processing" | "completed" | "failed",
    transcriptionText?: string,
    language?: string,
    transcriptionError?: string
  ): Promise<InstagramItem | undefined> {
    const updateData: Partial<InstagramItem> = { transcriptionStatus: status };
    if (transcriptionText !== undefined) updateData.transcriptionText = transcriptionText;
    if (language !== undefined) updateData.language = language;
    if (transcriptionError !== undefined) updateData.transcriptionError = transcriptionError;

    return await instagramItemsRepo.update(id, updateData);
  },

  /**
   * Проксировать изображение Instagram для избежания CORS
   */
  async proxyImage(dto: ProxyImageQueryDto): Promise<{ buffer: Buffer; contentType: string }> {
    const { url } = dto;

    // Валидация что URL от Instagram CDN
    if (!url.includes("cdninstagram.com")) {
      throw new InvalidProxyUrlError();
    }

    try {
      // Загрузить изображение с Instagram
      const response = await fetch(url);

      if (!response.ok) {
        logger.error("Failed to fetch Instagram image", { url, status: response.status });
        throw new ProxyImageFetchError(response.status);
      }

      // Получить buffer изображения
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";

      return {
        buffer: Buffer.from(buffer),
        contentType,
      };
    } catch (error: any) {
      if (error instanceof ProxyImageFetchError) {
        throw error;
      }
      logger.error("Error proxying Instagram image", { error: error.message });
      throw new Error("Failed to proxy image");
    }
  },
};
