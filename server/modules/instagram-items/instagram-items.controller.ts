import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { instagramItemsService } from "./instagram-items.service";
import {
  GetInstagramItemsQueryDto,
  UpdateItemActionDto,
  ProxyImageQueryDto,
  InstagramItemIdParamDto,
} from "./instagram-items.dto";
import {
  InstagramItemNotFoundError,
  InvalidActionError,
  VideoNotDownloadedError,
  TranscriptionNotCompletedError,
  InvalidProxyUrlError,
  ProxyImageFetchError,
} from "./instagram-items.errors";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";

export const instagramItemsController = {
  /**
   * GET /api/instagram/items - Получить все Instagram items текущего пользователя
   */
  async getInstagramItems(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const queryDto = GetInstagramItemsQueryDto.parse(req.query);
      const items = await instagramItemsService.getInstagramItems(userId, queryDto);

      res.json(items);
    } catch (error: any) {
      logger.error("Error fetching Instagram items", { error });
      res.status(500).json({ message: "Failed to fetch Instagram items" });
    }
  },

  /**
   * GET /api/instagram/items/:id - Получить конкретный Instagram item по ID
   */
  async getInstagramItemById(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = InstagramItemIdParamDto.parse(req.params);
      const item = await instagramItemsService.getInstagramItemById(id, userId);

      res.json(item);
    } catch (error: any) {
      logger.error("Error fetching Instagram item", { error });

      if (error instanceof InstagramItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch Instagram item" });
    }
  },

  /**
   * PATCH /api/instagram/items/:id/action - Обновить действие пользователя
   */
  async updateItemAction(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = InstagramItemIdParamDto.parse(req.params);
      const actionDto = UpdateItemActionDto.parse(req.body);

      const item = await instagramItemsService.updateItemAction(id, userId, actionDto);

      res.json(item);
    } catch (error: any) {
      logger.error("Error updating Instagram item action", { error });

      if (error instanceof InvalidActionError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof InstagramItemNotFoundError) {
        return res.status(404).json({ message: "Instagram item not found or not authorized" });
      }

      res.status(500).json({ message: "Failed to update Instagram item" });
    }
  },

  /**
   * POST /api/instagram/items/:id/transcribe - Запустить транскрипцию видео
   */
  async transcribeItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = InstagramItemIdParamDto.parse(req.params);
      const result = await instagramItemsService.transcribeItem(id, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error starting transcription", { error });

      if (error instanceof InstagramItemNotFoundError) {
        return res.status(404).json({ message: "Instagram item not found or not authorized" });
      }

      if (error instanceof VideoNotDownloadedError) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to start transcription" });
    }
  },

  /**
   * POST /api/instagram/items/:id/score - Оценить Instagram Reel с помощью AI
   */
  async scoreItem(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = InstagramItemIdParamDto.parse(req.params);
      const result = await instagramItemsService.scoreItem(id, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error scoring Instagram item", { error });

      if (error instanceof InstagramItemNotFoundError) {
        return res.status(404).json({ message: "Instagram item not found or not authorized" });
      }

      if (error instanceof TranscriptionNotCompletedError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof ApiKeyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to score Instagram item" });
    }
  },

  /**
   * GET /api/instagram/proxy-image - Проксировать Instagram изображения для избежания CORS
   */
  async proxyImage(req: Request, res: Response) {
    try {
      const queryDto = ProxyImageQueryDto.parse(req.query);

      if (!queryDto.url) {
        return res.status(400).json({ message: "URL parameter is required" });
      }

      const { buffer, contentType } = await instagramItemsService.proxyImage(queryDto);

      // Установить заголовки
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Кэш на 24 часа
      res.setHeader("Access-Control-Allow-Origin", "*"); // Разрешить CORS

      // Отправить изображение
      res.send(buffer);
    } catch (error: any) {
      logger.error("Error proxying Instagram image", { error });

      if (error instanceof InvalidProxyUrlError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof ProxyImageFetchError) {
        return res.status(error.message.includes("404") ? 404 : 500).json({
          message: error.message,
        });
      } // to do error middleware

      res.status(500).json({ message: "Failed to proxy image" });
    }
  },
};
