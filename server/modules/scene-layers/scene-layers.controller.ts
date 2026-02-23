import type { Request, Response } from "express";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { scriptsLibraryService } from "../scripts-library/scripts-library.service";
import { sceneLayersService } from "./scene-layers.service";
import {
  GetLayersParamsDto,
  CreateLayerBodyDto,
  UpdateLayerBodyDto,
  ScriptIdLayerIdParamsDto,
  UpdateCompositionBodyDto,
} from "./scene-layers.dto";
import { logger } from "../../lib/logger";
import {
  fetchBuffer,
  getExtensionFromUrl,
  getContentTypeFromExtension,
  isR2Url,
  getR2DownloadUrl,
  streamFromHttp,
} from "../content-export/media-fetcher";
import { StorageRepo } from "../storage/storage.repo";

export const sceneLayersController = {
  /** GET /api/scripts/:scriptId/scenes/:sceneId/layers */
  async getLayers(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, sceneId } = GetLayersParamsDto.parse(req.params);
      const result = await sceneLayersService.getLayersBySceneId(scriptId, sceneId, userId);
      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("scene-layers getLayers", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** POST /api/scripts/:scriptId/scenes/:sceneId/layers */
  async createLayer(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, sceneId } = GetLayersParamsDto.parse(req.params);
      const body = CreateLayerBodyDto.parse(req.body);
      const result = await sceneLayersService.createLayer(scriptId, sceneId, userId, {
        layerType: body.layerType,
        order: body.order,
        isVisible: body.isVisible,
        contentType: body.contentType as "avatar" | "image" | "video" | undefined,
        sourceUrl: body.sourceUrl,
        position: body.position,
        aspectLock: body.aspectLock,
        text: body.text,
        mode: body.mode,
        positionText: body.textPosition,
      });
      return apiResponse.created(res, result);
    } catch (e: any) {
      logger.error("scene-layers createLayer", { error: e.message });
      return apiResponse.badRequest(res, e.message);
    }
  },

  /** PATCH /api/scripts/:scriptId/layers/:layerId */
  async updateLayer(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, layerId } = ScriptIdLayerIdParamsDto.parse(req.params);
      const body = UpdateLayerBodyDto.parse(req.body);
      await sceneLayersService.updateLayer(layerId, scriptId, userId, body as any);
      return apiResponse.noContent(res);
    } catch (e: any) {
      logger.error("scene-layers updateLayer", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** DELETE /api/scripts/:scriptId/layers/:layerId */
  async deleteLayer(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, layerId } = ScriptIdLayerIdParamsDto.parse(req.params);
      await sceneLayersService.deleteLayer(layerId, scriptId, userId);
      return apiResponse.noContent(res);
    } catch (e: any) {
      logger.error("scene-layers deleteLayer", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** PATCH /api/scripts/:scriptId/scenes/:sceneId/composition */
  async updateComposition(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, sceneId } = GetLayersParamsDto.parse(req.params);
      const body = UpdateCompositionBodyDto.parse(req.body);
      await sceneLayersService.updateComposition(sceneId, scriptId, userId, body);
      return apiResponse.noContent(res);
    } catch (e: any) {
      logger.error("scene-layers updateComposition", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** GET /api/scripts/:scriptId/scenes/:sceneId (scene with layers) */
  async getSceneWithLayers(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, sceneId } = GetLayersParamsDto.parse(req.params);
      const result = await sceneLayersService.getSceneWithLayers(scriptId, sceneId, userId);
      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("scene-layers getSceneWithLayers", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** GET /api/scripts/:scriptId (script with all scenes and layers) */
  async getScriptWithLayers(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId } = req.params as { scriptId: string };
      const result = await sceneLayersService.getScriptWithLayers(scriptId, userId);
      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("scene-layers getScriptWithLayers", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** GET /api/scripts/:scriptId/layers/:layerId/download */
  async downloadLayerMedia(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, layerId } = ScriptIdLayerIdParamsDto.parse(req.params);
      const { sourceUrl, contentType, layerType } = await sceneLayersService.getLayerSourceUrl(
        layerId,
        scriptId,
        userId,
      );

      req.setTimeout(0);
      res.setTimeout(0);

      let ext = getExtensionFromUrl(sourceUrl);
      if (ext === "bin") {
        ext = contentType === "video" ? "mp4" : "jpg";
      }
      const filename = `${layerType}-${layerId}.${ext}`;

      logger.info("downloadLayerMedia starting", {
        layerId,
        layerType,
        contentType,
        sourceUrlHost: (() => { try { return new URL(sourceUrl).hostname; } catch { return "?"; } })(),
      });

      // R2 files: redirect to presigned download URL (no server memory usage)
      if (isR2Url(sourceUrl)) {
        const downloadUrl = await getR2DownloadUrl(sourceUrl, filename);
        if (downloadUrl) {
          logger.info("downloadLayerMedia redirecting to R2 presigned URL", { layerId });
          return res.redirect(downloadUrl);
        }
        logger.warn("downloadLayerMedia R2 presigned URL failed, falling back to buffer", { layerId });
      }

      // Non-R2 files: stream directly to response (no full buffering)
      const streamResult = await streamFromHttp(sourceUrl, `download-layer-${layerId}`);
      if (streamResult) {
        res.set({
          "Content-Type": getContentTypeFromExtension(ext),
          "Content-Disposition": `attachment; filename="${filename}"`,
        });
        if (streamResult.contentLength) {
          res.set("Content-Length", String(streamResult.contentLength));
        }
        streamResult.stream.pipe(res);
        return;
      }

      // Final fallback: buffer the entire file
      const buf = await fetchBuffer(sourceUrl, `download-layer-${layerId}`);
      if (!buf) {
        return apiResponse.serverError(res, "Failed to fetch media file");
      }

      res.set({
        "Content-Type": getContentTypeFromExtension(ext),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.length),
      });

      return res.send(buf);
    } catch (e: any) {
      logger.error("scene-layers downloadLayerMedia", { error: e.message });
      if (e.message === "Layer has no media") {
        return apiResponse.badRequest(res, e.message);
      }
      return apiResponse.serverError(res, e.message);
    }
  },

  /** POST /api/scripts/:scriptId/layers/:layerId/upload */
  async uploadLayerFile(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, layerId } = ScriptIdLayerIdParamsDto.parse(req.params);
      await scriptsLibraryService.getScriptById(scriptId, userId);

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return apiResponse.badRequest(res, "No file uploaded");
      }

      const layerType = req.body.layerType as string;
      if (!layerType || !["background", "overlay"].includes(layerType)) {
        return apiResponse.badRequest(res, "Invalid layerType");
      }

      const ext = file.originalname.split(".").pop()?.toLowerCase() || "bin";
      const isVideo = file.mimetype.startsWith("video/");
      const contentType = isVideo ? "video" : "image";
      const r2Key = `layers/${scriptId}/${layerId}/${Date.now()}.${ext}`;

      const storageRepo = new StorageRepo();
      const sourceUrl = await storageRepo.uploadFile(file.buffer, r2Key, file.mimetype);

      await sceneLayersService.updateLayer(layerId, scriptId, userId, {
        contentType,
        sourceUrl,
      });

      logger.info("Layer file uploaded", {
        layerId,
        layerType,
        contentType,
        size: file.size,
        r2Key,
      });

      return apiResponse.ok(res, { sourceUrl });
    } catch (e: any) {
      logger.error("scene-layers uploadLayerFile", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** POST /api/scripts/:scriptId/scenes/:sceneId/layers/default - create default layers */
  async createDefaultLayers(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, sceneId } = GetLayersParamsDto.parse(req.params);
      await scriptsLibraryService.getScriptById(scriptId, userId);
      await sceneLayersService.createDefaultLayers(sceneId, scriptId);
      return apiResponse.noContent(res);
    } catch (e: any) {
      logger.error("scene-layers createDefaultLayers", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },
};
