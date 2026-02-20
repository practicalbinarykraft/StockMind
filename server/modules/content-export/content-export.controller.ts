import type { Request, Response } from "express";
import { z } from "zod";
import { getUserId } from "../../utils/route-helpers";
import { logger } from "../../lib/logger";
import { contentExportService } from "./content-export.service";

const ExportArchiveParamsDto = z.object({
  scriptId: z.string().min(1),
});

export const contentExportController = {
  /**
   * GET /api/scripts/:scriptId/export/archive
   * Стримит ZIP-архив со всем контентом сцен
   */
  async downloadArchive(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { scriptId } = ExportArchiveParamsDto.parse(req.params);

      logger.info("Starting archive export", { scriptId, userId });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="script-${scriptId}.zip"`);

      await contentExportService.streamArchive(scriptId, userId, res);

      logger.info("Archive export completed", { scriptId, userId });
    } catch (e: any) {
      logger.error("content-export downloadArchive", { error: e.message });

      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }
  },
};
