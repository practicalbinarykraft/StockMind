import { z } from "zod";
import { insertProjectStepSchema } from "@shared/schema";

// DTO: Route param — project ID
export const ProjectIdParamDto = z.object({
  id: z.string(),
});

// DTO: Route param — step number
export const StepNumberParamDto = z.object({
  stepNumber: z.string().regex(/^\d+$/, "Step number must be a valid integer"),
});

// DTO: Create project step (POST /api/projects/:id/steps)
export const CreateProjectStepDto = insertProjectStepSchema.omit({ projectId: true });

// DTO: Skip project step (POST /api/projects/:id/steps/:stepNumber/skip)
export const SkipProjectStepBodyDto = z.object({
  reason: z.string().optional(),
});

// DTO: Combined params for skip endpoint
export const SkipProjectStepParamsDto = ProjectIdParamDto.merge(StepNumberParamDto);

// Export types
export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type StepNumberParamDto = z.infer<typeof StepNumberParamDto>;
export type CreateProjectStepDto = z.infer<typeof CreateProjectStepDto>;
export type SkipProjectStepBodyDto = z.infer<typeof SkipProjectStepBodyDto>;
export type SkipProjectStepParamsDto = z.infer<typeof SkipProjectStepParamsDto>;
