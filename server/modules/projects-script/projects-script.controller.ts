import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { projectsScriptService } from "./projects-script.service";
import {
  ProjectNotFoundError,
  NoContentFoundError,
  ApiKeyNotConfiguredError,
  FormatIdRequiredError,
  NoScenesGeneratedError,
  ScriptGenerationError,
} from "./projects-script.errors";
import { ProjectIdParamDto, GenerateScriptBodyDto } from "./projects-script.dto";

/**
 * Projects Script Controller
 * Работа с req/res, валидация входных данных, установка HTTP-статуса
 */
export const projectsScriptController = {
  /**
   * POST /api/projects/:id/generate-script
   * Генерация скрипта для проекта
   */
  async generateScript(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const body = GenerateScriptBodyDto.parse(req.body);

      const result = await projectsScriptService.generateScript(id, userId, body);

      res.json(result);
    } catch (error: any) {
      logger.error("Error generating script", {
        projectId: req.params.id,
        error: error.message,
        code: error.code,
        stack: error.stack,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof FormatIdRequiredError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof NoContentFoundError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof ApiKeyNotConfiguredError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof NoScenesGeneratedError) {
        return res.status(422).json({
          success: false,
          error: error.message,
          code: error.code,
          suggestions: error.suggestions,
        });
      }

      // Обработка NO_SCENES из вложенных ошибок
      if (error.code === 'NO_SCENES') {
        return res.status(422).json({
          success: false,
          error: error.message || 'AI не смог создать сценарий',
          code: 'NO_SCENES',
          suggestions: error.suggestions || [
            'Попробуйте другой формат видео',
            'Повторите попытку',
          ],
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate script"
      });
    }
  },
};
