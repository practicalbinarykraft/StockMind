import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { projectsAnalyzeService } from "./projects-analyze.service";
import {
  ProjectNotFoundError,
  NoContentFoundError,
  ApiKeyNotConfiguredError,
  AnalysisFailedError,
} from "./projects-analyze.errors";
import { ProjectIdParamDto } from "./projects-analyze.dto";

/**
 * Projects Analyze Controller
 * Работа с req/res, валидация входных данных, установка HTTP-статуса
 */
export const projectsAnalyzeController = {
  /**
   * POST /api/projects/:id/analyze-source
   * Анализ источника проекта
   */
  async analyzeSource(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const result = await projectsAnalyzeService.analyzeSource(id, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error analyzing source", {
        projectId: req.params.id,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }
      if (error instanceof NoContentFoundError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof ApiKeyNotConfiguredError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof AnalysisFailedError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({
        message: error.message || "Failed to analyze source content"
      });
    }
  },
};
