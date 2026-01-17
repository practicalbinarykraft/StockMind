import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { projectStepsService } from "./project-steps.service";
import {
  ProjectIdParamDto,
  CreateProjectStepDto,
  SkipProjectStepParamsDto,
  SkipProjectStepBodyDto,
} from "./project-steps.dto";
import {
  InvalidStepNumberError,
  StepNotSkippableError,
  StepNotCurrentError,
} from "./project-steps.errors";
import { ProjectNotFoundError, ProjectForbiddenError } from "../projects/projects.errors";

/**
 * Project Steps Controller
 * Работа с req/res, валидация входных данных
 */
export const projectStepsController = {
  /**
   * GET /api/projects/:id/steps
   * Получить все шаги проекта
   */
  async getProjectSteps(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const steps = await projectStepsService.getProjectSteps(id, userId);

      res.json(steps);
    } catch (error: any) {
      logger.error("Error fetching project steps", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ProjectForbiddenError) {
        return res.status(403).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch project steps" });
    }
  },

  /**
   * POST /api/projects/:id/steps
   * Создать новый шаг проекта
   */
  async createProjectStep(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = ProjectIdParamDto.parse(req.params);
      const validated = CreateProjectStepDto.parse(req.body);

      const step = await projectStepsService.createProjectStep(id, userId, validated);

      res.json(step);
    } catch (error: any) {
      logger.error("Error creating project step", {
        service: "stockmind-api",
        userId,
        errorType: error.constructor?.name,
        errorMessage: error.message,
        errorStack: error.stack,
        projectId: req.params?.id,
        requestBody: req.body,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ProjectForbiddenError) {
        return res.status(403).json({ message: error.message });
      }

      res.status(400).json({ message: "Failed to create project step", error: error.message });
    }
  },

  /**
   * POST /api/projects/:id/steps/:stepNumber/skip
   * Пропустить шаг проекта
   */
  async skipProjectStep(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id, stepNumber } = SkipProjectStepParamsDto.parse(req.params);
      const bodyData = SkipProjectStepBodyDto.parse(req.body);

      const step = parseInt(stepNumber, 10);
      const result = await projectStepsService.skipProjectStep(id, step, userId, bodyData);

      res.json(result);
    } catch (error: any) {
      logger.error("Error skipping step", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof ProjectNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ProjectForbiddenError) {
        return res.status(403).json({ message: error.message });
      }

      if (error instanceof InvalidStepNumberError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof StepNotSkippableError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof StepNotCurrentError) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to skip step" });
    }
  },
};
