import { requireAuth } from "../../middleware/jwt-auth";
import { Router } from "express";
import { sceneLayersController } from "./scene-layers.controller";
import type { Express } from "express";

const router = Router({ mergeParams: true });

// Слои сцены: GET /api/scripts/:scriptId/scenes/:sceneId/layers
router.get(
  "/scripts/:scriptId/scenes/:sceneId/layers",
  requireAuth,
  sceneLayersController.getLayers
);

// Создать слой: POST /api/scripts/:scriptId/scenes/:sceneId/layers
router.post(
  "/scripts/:scriptId/scenes/:sceneId/layers",
  requireAuth,
  sceneLayersController.createLayer
);

// Создать дефолтные слои сцены: POST /api/scripts/:scriptId/scenes/:sceneId/layers/default
router.post(
  "/scripts/:scriptId/scenes/:sceneId/layers/default",
  requireAuth,
  sceneLayersController.createDefaultLayers
);

// Обновить слой: PATCH /api/scripts/:scriptId/layers/:layerId
router.patch(
  "/scripts/:scriptId/layers/:layerId",
  requireAuth,
  sceneLayersController.updateLayer
);

// Удалить слой: DELETE /api/scripts/:scriptId/layers/:layerId
router.delete(
  "/scripts/:scriptId/layers/:layerId",
  requireAuth,
  sceneLayersController.deleteLayer
);

// Композиция сцены: PATCH /api/scripts/:scriptId/scenes/:sceneId/composition
router.patch(
  "/scripts/:scriptId/scenes/:sceneId/composition",
  requireAuth,
  sceneLayersController.updateComposition
);

// Сцена со слоями: GET /api/scripts/:scriptId/scenes/:sceneId
router.get(
  "/scripts/:scriptId/scenes/:sceneId",
  requireAuth,
  sceneLayersController.getSceneWithLayers
);

// Скрипт со всеми сценами и слоями: GET /api/scripts/:scriptId/layers
router.get(
  "/scripts/:scriptId/layers",
  requireAuth,
  sceneLayersController.getScriptWithLayers
);

export function registerSceneLayersRoutes(app: Express) {
  app.use("/api", router);
}
