import type { Request, Response } from "express";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { audioSplittingService } from "./audio-splitting.service";
import { logger } from "../../lib/logger";
import { z } from "zod";

const SplitAudioParamsDto = z.object({ scriptId: z.string().min(1) });
const SplitAudioBodyDto = z.object({ audioUrl: z.string().url() });

export const audioSplittingController = {
  /** POST /api/scripts/:scriptId/audio/split */
  async split(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId } = SplitAudioParamsDto.parse(req.params);
      const { audioUrl } = SplitAudioBodyDto.parse(req.body);
      const result = await audioSplittingService.splitAudioByScenes(scriptId, userId, audioUrl);
      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("audio-splitting split", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },
};
