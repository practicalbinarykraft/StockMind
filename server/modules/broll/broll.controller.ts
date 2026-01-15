import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { brollService } from "./broll.service";
import {
  ProjectIdParamDto,
  GeneratePromptBodyDto,
  GenerateBrollBodyDto,
  BrollStatusParamsDto,
} from "./broll.dto";
import {
  AnthropicApiKeyNotFoundError,
  KieaiApiKeyNotFoundError,
  GeneratePromptError,
  GenerateBrollError,
  BrollStatusError,
} from "./broll.errors";
import { ProjectNotFoundError, ProjectForbiddenError } from "../projects/projects.errors";

/**
 * B-Roll Controller
 * Обработка HTTP запросов для B-roll генерации
 */
export const brollController = {
  /**
   * POST /api/projects/:id/broll/generate-prompt
   * Сгенерировать AI промпт
   */
  async generatePrompt(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const validated = GeneratePromptBodyDto.parse(req.body);

      const result = await brollService.generatePrompt(id, userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error generating AI prompt", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ProjectForbiddenError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof GeneratePromptError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to generate AI prompt" });
    }
  },

  /**
   * POST /api/projects/:id/broll/generate
   * Сгенерировать B-roll видео
   */
  async generateBroll(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const validated = GenerateBrollBodyDto.parse(req.body);

      const result = await brollService.generateBroll(id, userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error generating B-Roll", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ProjectForbiddenError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof KieaiApiKeyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof GenerateBrollError) {
        const status = error.statusCode || 500;
        return res.status(status).json({
          message: error.message,
          error: error.apiMessage || error.message,
        });
      }

      res.status(500).json({ message: "Failed to generate B-Roll video" });
    }
  },

  /**
   * GET /api/projects/:id/broll/status/:taskId
   * Получить статус B-roll видео
   */
  async getBrollStatus(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id, taskId } = BrollStatusParamsDto.parse(req.params);

      const result = await brollService.getBrollStatus(id, taskId, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error checking B-Roll status", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ProjectForbiddenError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof KieaiApiKeyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof BrollStatusError) {
        const status = error.statusCode || 500;
        return res.status(status).json({
          message: error.message,
          error: error.apiMessage || error.message,
        });
      }

      res.status(500).json({ message: "Failed to check video status" });
    }
  },
};
