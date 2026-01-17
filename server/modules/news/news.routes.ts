import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { newsController } from "./news.controller";
import type { Express } from "express";

const router = Router();

// GET /api/news - Получить все новости
router.get("/news", requireAuth, newsController.getNews);

// GET /api/news/score/:id - Получить score для новости
router.get("/news/score/:id", requireAuth, newsController.getNewsScore);

// GET /api/news/all - Получить все статьи с фильтрами (News Hub)
router.get("/news/all", requireAuth, newsController.getAllNews);

// GET /api/news/favorites - Получить избранные статьи
router.get("/news/favorites", requireAuth, newsController.getFavorites);

// GET /api/news/:id/analysis - Получить сохраненный анализ
router.get("/news/:id/analysis", requireAuth, newsController.getAnalysis);

// POST /api/news/refresh - Ручное обновление из RSS
router.post("/news/refresh", requireAuth, newsController.refresh);

// POST /api/news/refresh-extended - Расширенный парсинг
router.post("/news/refresh-extended", requireAuth, newsController.refreshExtended);

// POST /api/news/score-batch - Batch scoring
router.post("/news/score-batch", requireAuth, newsController.scoreBatch);

// POST /api/news/:id/fetch-full-content - Получить полный контент
router.post("/news/:id/fetch-full-content", requireAuth, newsController.fetchFullContent);

// POST /api/news/:id/favorite - Добавить в избранное
router.post("/news/:id/favorite", requireAuth, newsController.addToFavorite);

// PATCH /api/news/:id/action - Обновить действие
router.patch("/news/:id/action", requireAuth, newsController.updateAction);

// DELETE /api/news/:id/favorite - Удалить из избранного
router.delete("/news/:id/favorite", requireAuth, newsController.removeFromFavorite);

export function registerNewsRoutes(app: Express) {
  app.use('/api', router);
}
