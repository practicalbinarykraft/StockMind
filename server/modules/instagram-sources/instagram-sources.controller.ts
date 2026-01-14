import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { insertInstagramSourceSchema } from "@shared/schema";
import { instagramSourcesService } from "./instagram-sources.service";
import { ParseInstagramSourceDto } from "./instagram-sources.dto";
import {
  InstagramSourceNotFoundError,
  ApifyKeyNotConfiguredError,
  InvalidApifyKeyError,
  InstagramParseError,
} from "./instagram-sources.errors";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";

export const instagramSourcesController = {
  /**
   * GET /api/settings/instagram-sources - Получить все Instagram источники
   * GET /api/instagram/sources - Алиас для обратной совместимости
  */
  async getInstagramSources(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const sources = await instagramSourcesService.getInstagramSources(userId);
      res.json(sources);
    } catch (error: any) {
      logger.error("Error fetching Instagram sources", { error });
      res.status(500).json({ message: "Failed to fetch Instagram sources" });
    }
  },

  /**
   * POST /api/settings/instagram-sources - Создать новый Instagram источник
  */
  async createInstagramSource(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = insertInstagramSourceSchema.parse(req.body); // dto
      const source = await instagramSourcesService.createInstagramSource(userId, validated);

      res.json(source);
    } catch (error: any) {
      logger.error("Error creating Instagram source", { error });

      if (error instanceof ApiKeyNotFoundError) {
        return res.status(404).json({
            message: error.message
        })
      }

      res.status(400).json({ message: "Failed to create Instagram source" });
    }
  },

  /**
   * DELETE /api/settings/instagram-sources/:id - Удалить Instagram источник
  */
  async deleteInstagramSource(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      await instagramSourcesService.deleteInstagramSource(id, userId);

      res.json({ success: true });
    } catch (error: any) {
      logger.error("Error deleting Instagram source", { error });
      res.status(500).json({ message: "Failed to delete Instagram source" });
    }
  },

  /**
   * POST /api/instagram/sources/:id/parse - Парсить Instagram Reels из источника
  */
  async parseInstagramSource(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const dto: ParseInstagramSourceDto = ParseInstagramSourceDto.parse(req.body);

      const result = await instagramSourcesService.parseInstagramSource(id, userId, dto);

      res.json(result);
    } catch (error: any) {
      logger.error("Error parsing Instagram source", { error });

      if (error instanceof InstagramSourceNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ApiKeyNotFoundError) {
        return res.status(404).json({
            message: error.message
        })
      }
      
      if (error instanceof ApifyKeyNotConfiguredError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof InvalidApifyKeyError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof InstagramParseError) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({ message: "Failed to parse Instagram source" });
    } // to do error middleware
  },

  /**
   * POST /api/instagram/sources/:id/check-now - Проверить источник на новые Reels
  */
  async checkNow(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

      const result = await instagramSourcesService.checkNow(id, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in manual Instagram check", { error });

      if (error instanceof InstagramSourceNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ApifyKeyNotConfiguredError) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to check Instagram source",
      });
    }
  },

  /**
   * GET /api/instagram/limits - Получить лимиты парсинга
   */
  async getLimits(req: Request, res: Response) {
    try {
      const result = await instagramSourcesService.getLimits();
      res.json(result);
    } catch (error: any) {
      logger.error("Error fetching Instagram limits", { error });
      res.status(500).json({ message: "Failed to fetch limits" });
    }
  },
};
