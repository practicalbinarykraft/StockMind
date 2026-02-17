// ============================================================================
// VIDEO RENDERING ROUTES
// ============================================================================
// Регистрация маршрутов для управления рендерингом видео

import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { videoRenderingController } from "./video-rendering.controller";
import type { Express } from "express";

const router = Router();

// ============================================================================
// ROUTES
// ============================================================================

// Запустить рендеринг видео для скрипта
router.post(
  "/scripts/:scriptId/render",
  requireAuth,
  videoRenderingController.renderVideo
);

// Получить статус задачи рендеринга
router.get(
  "/scripts/:scriptId/render/:jobId/status",
  requireAuth,
  videoRenderingController.getRenderStatus
);

// Получить все задачи рендеринга текущего пользователя
router.get(
  "/render/jobs",
  requireAuth,
  videoRenderingController.getUserRenderJobs
);

// Отменить задачу рендеринга
router.delete(
  "/render/jobs/:jobId",
  requireAuth,
  videoRenderingController.cancelRenderJob
);

// Получить download URL для готового видео
router.get(
  "/scripts/:scriptId/render/:jobId/download",
  requireAuth,
  videoRenderingController.getDownloadUrl
);

// Получить preview URL для просмотра видео
router.get(
  "/scripts/:scriptId/render/:jobId/preview",
  requireAuth,
  videoRenderingController.getPreviewUrl
);

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerVideoRenderingRoutes(app: Express) {
  app.use("/api", router);
}
