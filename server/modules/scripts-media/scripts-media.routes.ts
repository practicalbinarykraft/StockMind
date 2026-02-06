import { Router } from "express";
import { requireAuth } from "../../middleware/jwt-auth";
import { scriptsMediaController } from "./scripts-media.controller";

const router = Router();

/**
 * Routes для Scripts Media
 * Все роуты требуют авторизации
 */

// GET /api/scripts/:scriptId/media - Получить медиа
router.get("/scripts/:scriptId/media", requireAuth, scriptsMediaController.getMedia);

// PUT /api/scripts/:scriptId/media - Upsert медиа
router.put("/scripts/:scriptId/media", requireAuth, scriptsMediaController.upsertMedia);

// PATCH /api/scripts/:scriptId/media/audio - Обновить аудио
router.patch("/scripts/:scriptId/media/audio", requireAuth, scriptsMediaController.updateAudio);

// PATCH /api/scripts/:scriptId/media/video - Обновить видео
router.patch("/scripts/:scriptId/media/video", requireAuth, scriptsMediaController.updateVideo);

// GET /api/scripts/:scriptId/media/status - Получить статус
router.get("/scripts/:scriptId/media/status", requireAuth, scriptsMediaController.getStatus);

// DELETE /api/scripts/:scriptId/media - Удалить медиа
router.delete("/scripts/:scriptId/media", requireAuth, scriptsMediaController.deleteMedia);

export default router;
