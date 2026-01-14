import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { insertRssSourceSchema } from "@shared/schema";
import { rssSourcesService } from "./rss-sources.service";
import { UpdateRssSourceDto } from "./rss-sources.dto";

export const rssSourcesController = {
  /**
   * GET /api/settings/rss-sources - Получить все RSS источники текущего пользователя
   */
  async getRssSources(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const sources = await rssSourcesService.getRssSources(userId);
      res.json(sources);
    } catch (error: any) {
      logger.error("Error fetching RSS sources", { error });
      res.status(500).json({ message: "Failed to fetch RSS sources" });
    }
  },

  /**
   * POST /api/settings/rss-sources - Создать новый RSS источник
   */
  async createRssSource(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = insertRssSourceSchema.parse(req.body); // dto
      const source = await rssSourcesService.createRssSource(userId, validated);

      res.json(source);
    } catch (error: any) {
      logger.error("Error creating RSS source", { error });
      res.status(400).json({ message: "Failed to create RSS source" });
    }
  },

  /**
   * PATCH /api/settings/rss-sources/:id - Обновить RSS источник
   */
  async updateRssSource(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const source = await rssSourcesService.updateRssSource(id, userId, req.body);

      if (!source) {
        return res.status(404).json({ message: "RSS source not found" });
      } // в service

      res.json(source);
    } catch (error: any) {
      logger.error("Error updating RSS source", { error });
      res.status(500).json({ message: "Failed to update RSS source" });
    }
  },

  /**
   * DELETE /api/settings/rss-sources/:id - Удалить RSS источник
   */
  async deleteRssSource(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      await rssSourcesService.deleteRssSource(id, userId);
      
      res.json({ success: true });
    } catch (error: any) {
      logger.error("Error deleting RSS source", { error });
      res.status(500).json({ message: "Failed to delete RSS source" });
    }
  },

  /**
   * POST /api/settings/rss-sources/:id/parse - Вручную запустить парсинг RSS источника
   */
  async triggerParsing(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const result = await rssSourcesService.triggerParsing(id, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error triggering RSS parsing", { error });
      
      if (error.message === "RSS source not found") {
        return res.status(404).json({ message: "RSS source not found" });
      }

      res.status(500).json({ message: "Failed to trigger parsing" });
    }
  },
};
