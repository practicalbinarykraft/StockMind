import type { Request, Response } from "express";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { scriptsLibraryService } from "../scripts-library/scripts-library.service";
import { backgroundRemovalService } from "./background-removal.service";
import { logger } from "../../lib/logger";

export const backgroundRemovalController = {
  /** POST /api/scripts/:scriptId/layers/:layerId/remove-background */
  async startRemoveBackground(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, layerId } = req.params;
      await scriptsLibraryService.getScriptById(scriptId, userId);

      const result = await backgroundRemovalService.startProcessing(
        layerId,
        scriptId,
        userId,
      );

      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("background-removal start", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** GET /api/scripts/:scriptId/layers/:layerId/remove-background/status */
  async getRemoveBackgroundStatus(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, layerId } = req.params;
      await scriptsLibraryService.getScriptById(scriptId, userId);

      const status = backgroundRemovalService.getStatus(layerId);
      if (!status) {
        return apiResponse.ok(res, { status: "idle" });
      }

      return apiResponse.ok(res, status);
    } catch (e: any) {
      logger.error("background-removal status", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** GET /api/scripts/:scriptId/layers/:layerId/processed-video */
  async streamProcessedVideo(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId, layerId } = req.params;
      await scriptsLibraryService.getScriptById(scriptId, userId);

      const presignedUrl =
        await backgroundRemovalService.getProcessedVideoPresignedUrl(layerId);
      if (!presignedUrl) {
        return apiResponse.badRequest(res, "No processed video available");
      }

      req.setTimeout(0);
      res.setTimeout(0);

      const rangeHeader = req.headers.range;
      const corsHeaders: Record<string, string> = {
        "Access-Control-Allow-Origin": req.headers.origin || "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Expose-Headers":
          "Content-Range, Content-Length, Accept-Ranges",
        "Cache-Control": "public, max-age=86400",
      };

      const { default: axios } = await import("axios");
      const requestHeaders: Record<string, string> = {
        "User-Agent": "StockMind/1.0",
      };
      if (rangeHeader) {
        requestHeaders["Range"] = rangeHeader;
      }

      const response = await axios.get(presignedUrl, {
        responseType: "stream",
        timeout: 120_000,
        headers: requestHeaders,
        validateStatus: (s) => s >= 200 && s < 300,
      });

      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        "Content-Type": response.headers["content-type"] || "video/webm",
        "Accept-Ranges": response.headers["accept-ranges"] || "bytes",
      };
      if (response.headers["content-length"]) {
        responseHeaders["Content-Length"] = response.headers["content-length"];
      }
      if (response.headers["content-range"]) {
        responseHeaders["Content-Range"] = response.headers["content-range"];
      }

      res.set(responseHeaders);
      res.status(response.status);
      response.data.pipe(res);
    } catch (e: any) {
      logger.error("background-removal stream", { error: e.message });
      res.status(500).json({ message: "Failed to stream processed video" });
    }
  },
};
