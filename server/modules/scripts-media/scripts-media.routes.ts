import { Router } from "express";
import { scriptsMediaController } from "./scripts-media.controller";

const router = Router();

/**
 * Routes для Scripts Media
 */

// GET /api/scripts/:scriptId/media - Получить медиа
router.get("/scripts/:scriptId/media", scriptsMediaController.getMedia);

// PUT /api/scripts/:scriptId/media - Upsert медиа
router.put("/scripts/:scriptId/media", scriptsMediaController.upsertMedia);

// PATCH /api/scripts/:scriptId/media/audio - Обновить аудио
router.patch("/scripts/:scriptId/media/audio", scriptsMediaController.updateAudio);

// PATCH /api/scripts/:scriptId/media/video - Обновить видео
router.patch("/scripts/:scriptId/media/video", scriptsMediaController.updateVideo);

// GET /api/scripts/:scriptId/media/status - Получить статус
router.get("/scripts/:scriptId/media/status", scriptsMediaController.getStatus);

// DELETE /api/scripts/:scriptId/media - Удалить медиа
router.delete("/scripts/:scriptId/media", scriptsMediaController.deleteMedia);

export default router;
