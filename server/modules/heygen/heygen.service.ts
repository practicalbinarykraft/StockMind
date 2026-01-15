import axios from "axios";
import { fetchHeyGenAvatars, generateHeyGenVideo, getHeyGenVideoStatus } from "../../heygen-service";
import { logger } from "../../lib/logger";
import { apiKeysService } from "../api-keys/api-keys.service";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";
import { HeygenRepo } from "./heygen.repo";
import {
  HeygenApiKeyNotFoundError,
  HeygenFetchAvatarsError,
  HeygenGenerateVideoError,
  HeygenVideoStatusError,
  ProxyDomainNotAllowedError,
  ProxyRateLimitError,
  ProxyTimeoutError,
  ProxyNotFoundError,
} from "./heygen.errors";
import type { GetAvatarsQueryDto, GenerateVideoDto } from "./heygen.dto";

/**
 * HeyGen Service
 * Бизнес-логика для работы с HeyGen API
 */
export class HeygenService {
  private repo: HeygenRepo;

  constructor() {
    this.repo = new HeygenRepo();
  }

  /**
   * Получить расшифрованный HeyGen API ключ
   */
  private async getDecryptedApiKey(userId: string): Promise<string> {
    try {
      const apiKey = await apiKeysService.getUserApiKey(userId, "heygen");
      return apiKey.decryptedKey;
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        throw new HeygenApiKeyNotFoundError();
      }
      throw error;
    }
  }

  /**
   * Получить список аватаров с пагинацией
   */
  async fetchAvatars(userId: string, query: GetAvatarsQueryDto) {
    const { page, limit } = query;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Fetching HeyGen avatars", { userId, page, limit });

    try {
      // Fetch ALL avatars (cached)
      const allAvatars = await fetchHeyGenAvatars(decryptedKey);

      // Apply pagination
      const offset = page * limit;
      const paginatedAvatars = allAvatars.slice(offset, offset + limit);
      const totalPages = Math.ceil(allAvatars.length / limit);

      logger.debug("Returning paginated avatars", {
        total: allAvatars.length,
        page,
        limit,
        returned: paginatedAvatars.length,
        totalPages,
      });

      return {
        avatars: paginatedAvatars,
        pagination: {
          page,
          limit,
          total: allAvatars.length,
          totalPages,
          hasNextPage: page < totalPages - 1,
        },
      };
    } catch (error: any) {
      logger.error("Error fetching HeyGen avatars", { error: error.message });
      throw new HeygenFetchAvatarsError(error.message);
    }
  }

  /**
   * Сгенерировать видео с аватаром
   */
  async generateVideo(userId: string, dto: GenerateVideoDto) {
    const { avatarId, script, audioUrl, voiceId, dimension } = dto;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.info("Generating HeyGen video", { userId, avatarId, mode: audioUrl ? "audio" : "text" });

    try {
      const videoId = await generateHeyGenVideo(decryptedKey, {
        avatar_id: avatarId,
        script,
        audio_url: audioUrl,
        voice_id: voiceId,
        dimension,
      });

      return { videoId };
    } catch (error: any) {
      logger.error("Error generating HeyGen video", { error: error.message });

      const status = error.statusCode || error.response?.status || 500;
      const apiMessage = error.apiMessage || error.message;

      throw new HeygenGenerateVideoError(
        error.message || "Failed to generate HeyGen video",
        status,
        apiMessage
      );
    }
  }

  /**
   * Получить статус генерации видео
   */
  async getVideoStatus(userId: string, videoId: string) {
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Checking HeyGen video status", { videoId });

    try {
      const status = await getHeyGenVideoStatus(decryptedKey, videoId);
      return status;
    } catch (error: any) {
      logger.error("Error checking HeyGen video status", { error: error.message, videoId });

      const statusCode = error.statusCode || error.response?.status || 500;
      const apiMessage = error.apiMessage || error.message;

      throw new HeygenVideoStatusError(error.message || "Failed to check video status", statusCode, apiMessage);
    }
  }

  /**
   * Проксировать изображение
   */
  async proxyImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    // Validate domain
    const parsedUrl = new URL(url);
    if (!this.repo.isDomainAllowed(parsedUrl.hostname)) {
      logger.warn("Blocked image proxy attempt to disallowed domain", {
        hostname: parsedUrl.hostname,
        url,
      });
      throw new ProxyDomainNotAllowedError(parsedUrl.hostname);
    }

    // Rate limiting
    if (!this.repo.canMakeImageRequest()) {
      logger.warn("Image proxy rate limit exceeded", {
        active: this.repo.getActiveImageRequestsCount(),
        max: 10,
      });
      throw new ProxyRateLimitError();
    }

    const requestId = `${Date.now()}-${Math.random()}`;
    this.repo.trackImageRequest(requestId);

    try {
      logger.debug("Proxying HeyGen image", {
        url: url.substring(0, 100),
        activeRequests: this.repo.getActiveImageRequestsCount(),
      });

      const result = await this.repo.fetchImage(url);
      return result;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          logger.error("Image proxy timeout", { url });
          throw new ProxyTimeoutError("image");
        }
        if (error.response?.status === 404) {
          throw new ProxyNotFoundError("image");
        }
      }
      logger.error("Error proxying HeyGen image", { error: error.message, url });
      throw error;
    } finally {
      this.repo.untrackImageRequest(requestId);
    }
  }

  /**
   * Проксировать видео
   */
  async proxyVideo(
    url: string,
    rangeHeader?: string,
    download?: string
  ): Promise<{
    stream: any;
    status: number;
    headers: Record<string, string>;
    filename?: string;
  }> {
    // Validate domain
    const parsedUrl = new URL(url);
    if (!this.repo.isDomainAllowed(parsedUrl.hostname)) {
      logger.warn("Blocked video proxy attempt to disallowed domain", {
        hostname: parsedUrl.hostname,
        url,
      });
      throw new ProxyDomainNotAllowedError(parsedUrl.hostname);
    }

    logger.debug("Proxying HeyGen video", { url: url.substring(0, 100), download: !!download });

    try {
      const result = await this.repo.fetchVideoStream(url, rangeHeader);

      const contentType = result.headers["content-type"] || "video/mp4";
      const contentLength = result.headers["content-length"];
      const contentRange = result.headers["content-range"];
      const acceptRanges = result.headers["accept-ranges"];

      const responseHeaders: Record<string, string> = {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      };

      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength;
      }

      if (contentRange) {
        responseHeaders["Content-Range"] = contentRange;
      }

      if (acceptRanges) {
        responseHeaders["Accept-Ranges"] = acceptRanges;
      } else {
        responseHeaders["Accept-Ranges"] = "bytes";
      }

      let filename: string | undefined;
      if (download === "true") {
        const urlPath = parsedUrl.pathname;
        filename = urlPath.split("/").pop() || "heygen-video.mp4";
        responseHeaders["Content-Disposition"] = `attachment; filename="${filename}"`;
      }

      return {
        stream: result.stream,
        status: result.status,
        headers: responseHeaders,
        filename,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          logger.error("Video proxy timeout", { url });
          throw new ProxyTimeoutError("video");
        }
        if (error.response?.status === 404) {
          throw new ProxyNotFoundError("video");
        }
        if (error.response?.status === 416) {
          throw new Error("Range not satisfiable");
        }
      }
      logger.error("Error proxying HeyGen video", { error: error.message, url });
      throw error;
    }
  }
}

export const heygenService = new HeygenService();
