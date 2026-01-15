import { db } from "../../db";
import { projectSteps } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger";
import { ProjectsService } from "../projects/projects.service";
import {
  InvalidStepNumberError,
  StepNotSkippableError,
  StepNotCurrentError,
} from "./project-steps.errors";
import type { CreateProjectStepDto, SkipProjectStepBodyDto } from "./project-steps.dto";

/**
 * Project Steps Service
 * Вся бизнес-логика для управления шагами проекта
 */
export class ProjectStepsService {
  private projectsService: ProjectsService;

  constructor() {
    this.projectsService = new ProjectsService();
  }

  /**
   * Получить все шаги проекта
   */
  async getProjectSteps(projectId: string, userId: string) {
    // Verify project ownership через projects service
    await this.projectsService.getProjectById(projectId, userId);

    const steps = await this.projectsService.getProjectSteps(projectId);

    logger.debug("Returning project steps", {
      projectId,
      stepCount: steps.length,
      stepNumbers: steps.map(s => s.stepNumber),
    });

    return steps;
  }

  /**
   * Создать новый шаг проекта
   */
  async createProjectStep(projectId: string, userId: string, dto: CreateProjectStepDto) {
    // Verify project ownership
    await this.projectsService.getProjectById(projectId, userId);

    const stepData = {
      ...dto,
      projectId,
    };

    const step = await this.projectsService.createProjectStep(stepData as any);
    
    logger.info("Project step created", {
      projectId,
      stepNumber: step.stepNumber,
    });

    return step;
  }

  /**
   * Пропустить шаг проекта
   * Только stages 4 (Voice) и 5 (Avatar) можно пропустить
   */
  async skipProjectStep(
    projectId: string,
    stepNumber: number,
    userId: string,
    dto: SkipProjectStepBodyDto
  ) {
    // Validate stepNumber
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 8) {
      throw new InvalidStepNumberError("Step number must be between 1 and 8");
    }

    // Only stages 4 (Voice) and 5 (Avatar) can be skipped
    if (stepNumber !== 4 && stepNumber !== 5) {
      throw new StepNotSkippableError(stepNumber);
    }

    // Verify project ownership and get project
    const project = await this.projectsService.getProjectById(projectId, userId);

    // Check if user is at this stage or has already passed it
    if (project.currentStage !== stepNumber && project.currentStage < stepNumber) {
      throw new StepNotCurrentError();
    }

    // Get existing steps
    const existingSteps = await this.projectsService.getProjectSteps(projectId);
    const existingStep = existingSteps.find(s => s.stepNumber === stepNumber);

    if (existingStep) {
      // Update existing step with skip reason
      await db
        .update(projectSteps)
        .set({
          skipReason: dto.reason || "Skipped by user",
          completedAt: existingStep.completedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(projectSteps.id, existingStep.id));
    } else {
      // Create new step with skip reason
      await this.projectsService.createProjectStep({
        projectId,
        stepNumber,
        data: {},
        skipReason: dto.reason || "Skipped by user",
        completedAt: new Date(),
      } as any);
    }

    // Auto-advance to next stage if this was the current stage
    if (project.currentStage === stepNumber) {
      await this.projectsService.updateProject(projectId, userId, {
        currentStage: stepNumber + 1,
      });
    }

    // Fetch updated project and steps
    const updatedProject = await this.projectsService.getProjectByIdAndUserId(projectId, userId);
    const updatedSteps = await this.projectsService.getProjectSteps(projectId);

    logger.info("Project step skipped", {
      projectId,
      stepNumber,
      reason: dto.reason,
    });

    return {
      project: updatedProject,
      steps: updatedSteps,
    };
  }
}

export const projectStepsService = new ProjectStepsService();
