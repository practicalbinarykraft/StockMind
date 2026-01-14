import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { newsService } from "./news.service";
import {
  NewsItemNotFoundError,
  ArticleContentFetchError,
  ArticleAnalysisNotFoundError,
  BatchScoringError,
  RefreshNewsError
} from "./news.errors";
import {
  NewsIdParamDto,
  UpdateNewsActionDto,
  AddToFavoriteDto,
  BatchScoreDto,
  ExtendedRefreshDto,
  NewsFiltersDto
} from "./news.dto";

export const newsController = {
  /**
   * GET /api/news - Получить все новости с enriched данными
   */
  async getNews(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const items = await newsService.getNews(userId);
      res.json(items);
    } catch (error: any) {
      logger.error("Error fetching news items", { userId, error: error.message });
      res.status(500).json({ message: "Failed to fetch news items" });
    }
  },

  /**
   * GET /api/news/score/:id - Получить AI score для конкретной новости
   */
  async getNewsScore(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = NewsIdParamDto.parse(req.params);
      const scoreData = await newsService.getNewsScore(id, userId);

      res.json(scoreData);
    } catch (error: any) {
      logger.error("Error fetching news item score", { userId, error: error.message });

      if (error instanceof NewsItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch score" });
    }
  },

  /**
   * PATCH /api/news/:id/action - Обновить действие пользователя (dismiss, select, seen)
   */
  async updateAction(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = NewsIdParamDto.parse(req.params);
      const { action, projectId } = UpdateNewsActionDto.parse(req.body);

      const updated = await newsService.updateNewsAction(id, userId, action, projectId);
      res.json({ success: true, item: updated });
    } catch (error: any) {
      logger.error("Error updating news item action", { userId, error: error.message });

      if (error instanceof NewsItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to update news item" });
    }
  },

  /**
   * POST /api/news/refresh - Ручное обновление из RSS источников
   */
  async refresh(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await newsService.refreshNews(userId);
      res.json(result);
    } catch (error: any) {
      logger.error("Error refreshing news", { userId, error: error.message });

      if (error instanceof RefreshNewsError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to refresh news" });
    }
  },

  /**
   * POST /api/news/score-batch - Оценить несколько новостей по ID
   */
  async scoreBatch(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { itemIds } = BatchScoreDto.parse(req.body);
      const result = await newsService.scoreBatch(itemIds, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in batch scoring", { userId, error: error.message });

      if (error instanceof BatchScoringError) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to score items" });
    }
  },

  /**
   * GET /api/news/:id/analysis - Получить сохраненный анализ статьи
   */
  async getAnalysis(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) {
        logger.warn(`[News Analysis] Unauthorized request for article analysis`);
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { id } = NewsIdParamDto.parse(req.params);
      const analysis = await newsService.getAnalysis(id, userId);

      res.json(analysis);
    } catch (error: any) {
      logger.error("[News Analysis] ❌ Error fetching article analysis:", {
        userId,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof NewsItemNotFoundError) {
        return res.status(404).json({ success: false, error: error.message });
      }

      if (error instanceof ArticleAnalysisNotFoundError) {
        return res.status(404).json({ success: false, error: error.message });
      }

      res.status(500).json({
        success: false,
        error: "Failed to fetch analysis",
        message: error.message
      });
    }
  },

  /**
   * POST /api/news/:id/fetch-full-content - Получить полный контент через web scraping
   */
  async fetchFullContent(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = NewsIdParamDto.parse(req.params);
      const result = await newsService.fetchFullContent(id, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error fetching full article content", { userId, error: error.message });

      if (error instanceof NewsItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ArticleContentFetchError) {
        // Возвращаем ошибку, но можем предложить fallback
        const sources = await newsService.getNews(userId!);
        const item = sources.find((i: any) => i.id === req.params.id);
        return res.json({
          success: false,
          error: error.reason,
          fallback: item?.content || ''
        });
      }

      res.status(500).json({ message: "Failed to fetch article content" });
    }
  },

  /**
   * POST /api/news/refresh-extended - Расширенный парсинг
   */
  async refreshExtended(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = ExtendedRefreshDto.parse(req.body);
      const result = await newsService.refreshExtended(userId, validated.startDate, validated.endDate);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in extended refresh", { userId, error: error.message });
      res.status(500).json({ message: "Failed to perform extended refresh" });
    }
  },

  /**
   * GET /api/news/all - Получить все статьи с фильтрами (News Hub)
   */
  async getAllNews(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const filters = NewsFiltersDto.parse(req.query);
      const items = await newsService.getAllNews(userId, filters);

      res.json(items);
    } catch (error: any) {
      logger.error("Error fetching all news", { userId, error: error.message });
      res.status(500).json({ message: "Failed to fetch news" });
    }
  },

  /**
   * POST /api/news/:id/favorite - Добавить в избранное
   */
  async addToFavorite(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = NewsIdParamDto.parse(req.params);
      const { notes } = AddToFavoriteDto.parse(req.body);

      const result = await newsService.addToFavorite(id, userId, notes);
      res.json(result);
    } catch (error: any) {
      logger.error("Error adding to favorites", { userId, error: error.message });

      if (error instanceof NewsItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to add to favorites" });
    }
  },

  /**
   * DELETE /api/news/:id/favorite - Удалить из избранного
   */
  async removeFromFavorite(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = NewsIdParamDto.parse(req.params);
      const result = await newsService.removeFromFavorite(id, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error removing from favorites", { userId, error: error.message });

      if (error instanceof NewsItemNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  },

  /**
   * GET /api/news/favorites - Получить все избранные статьи
   */
  async getFavorites(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const items = await newsService.getFavorites(userId);
      res.json(items);
    } catch (error: any) {
      logger.error("Error fetching favorites", { userId, error: error.message });
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  },
};
