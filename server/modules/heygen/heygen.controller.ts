import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { heygenService } from "./heygen.service";
import {
  GetAvatarsQueryDto,
  GenerateVideoDto,
  VideoStatusParamsDto,
  ImageProxyQueryDto,
  VideoProxyQueryDto,
} from "./heygen.dto";
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

/**
 * HeyGen Controller
 * Обработка HTTP запросов для HeyGen
 */
export const heygenController = {
  /**
   * GET /api/heygen/avatars
   * Получить список аватаров
   */
  async getAvatars(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = GetAvatarsQueryDto.parse(req.query);
      const result = await heygenService.fetchAvatars(userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error fetching HeyGen avatars", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof HeygenApiKeyNotFoundError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof HeygenFetchAvatarsError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch avatars" });
    }
  },

  /**
   * POST /api/heygen/generate
   * Сгенерировать видео
   */
  async generateVideo(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = GenerateVideoDto.parse(req.body);
      const result = await heygenService.generateVideo(userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error generating HeyGen video", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof HeygenApiKeyNotFoundError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof HeygenGenerateVideoError) {
        const status = error.statusCode || 500;
        return res.status(status).json({
          message: error.message,
          error: error.apiMessage || error.message,
        });
      }

      res.status(500).json({ message: "Failed to generate HeyGen video" });
    }
  },// to do zodError

  /**
   * GET /api/heygen/status/:videoId
   * Получить статус видео
   */
  async getVideoStatus(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { videoId } = VideoStatusParamsDto.parse(req.params);
      const result = await heygenService.getVideoStatus(userId, videoId);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      logger.error("Error checking HeyGen video status", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof HeygenApiKeyNotFoundError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof HeygenVideoStatusError) {
        return apiResponse.serverError(res, error.message, error);
      }

      return apiResponse.serverError(res, "Failed to check video status", error);
    }
  },

  /**
   * GET /api/heygen/image-proxy
   * Проксировать изображение
   */
  async proxyImage(req: Request, res: Response) {
    try {
      const { url } = ImageProxyQueryDto.parse(req.query);
      const result = await heygenService.proxyImage(url);

      res.set({
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "X-Content-Type-Options": "nosniff",
      });

      res.send(result.buffer);
    } catch (error: any) {
      logger.error("Error proxying HeyGen image", {
        errorType: error.constructor?.name,
      });

      if (error instanceof ProxyDomainNotAllowedError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof ProxyRateLimitError) {
        return res.status(429).json({ message: error.message });
      }

      if (error instanceof ProxyTimeoutError) {
        return res.status(504).json({ message: error.message });
      }

      if (error instanceof ProxyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch image" });
    }
  },

  /**
   * GET /api/heygen/video-proxy
   * Проксировать видео
   */
  async proxyVideo(req: Request, res: Response) {
    try {
      const { url, download } = VideoProxyQueryDto.parse(req.query);
      const rangeHeader = req.headers.range;

      const result = await heygenService.proxyVideo(url, rangeHeader, download);

      res.set(result.headers);
      res.status(result.status);

      // Stream the video to the client
      result.stream.pipe(res);
    } catch (error: any) {
      logger.error("Error proxying HeyGen video", {
        errorType: error.constructor?.name,
      });

      if (error instanceof ProxyDomainNotAllowedError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof ProxyTimeoutError) {
        return res.status(504).json({ message: error.message });
      }

      if (error instanceof ProxyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error.message === "Range not satisfiable") {
        return res.status(416).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch video" });
    }
  },
};
