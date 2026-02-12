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

// === Прокси endpoints для медиа файлов ===
// GET /api/scripts/:scriptId/media/audio/stream - Воспроизвести аудио
router.get("/scripts/:scriptId/media/audio/stream", requireAuth, scriptsMediaController.streamAudio);

// GET /api/scripts/:scriptId/media/audio/download - Скачать аудио
router.get("/scripts/:scriptId/media/audio/download", requireAuth, scriptsMediaController.downloadAudio);

// GET /api/scripts/:scriptId/media/image/stream - Отобразить изображение
router.get("/scripts/:scriptId/media/image/stream", requireAuth, scriptsMediaController.streamImage);

export default router;
