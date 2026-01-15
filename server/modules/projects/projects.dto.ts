import { z } from "zod";
import { insertProjectSchema } from "@shared/schema";

// ============================================================================
// QUERY PARAMS
// ============================================================================

// DTO: Query параметры для получения всех проектов
export const GetProjectsQueryDto = z.object({
  include: z.string().optional(), // "steps,currentVersion" - comma-separated
});

// ============================================================================
// ROUTE PARAMS
// ============================================================================

// DTO: ID проекта в params
export const ProjectIdParamDto = z.object({
  id: z.string().min(1),
});

// DTO: ID элемента (для Instagram/News) в params
export const ItemIdParamDto = z.object({
  itemId: z.string().min(1),
});

// ============================================================================
// REQUEST BODY
// ============================================================================

// DTO: Создание нового проекта
export const CreateProjectDto = insertProjectSchema;

// DTO: Обновление проекта
export const UpdateProjectDto = z.object({
  title: z.string().max(255).optional(),
  sourceType: z.string().max(20).optional(),
  sourceData: z.any().optional(), // jsonb
  currentStage: z.number().int().min(1).max(8).optional(),
  status: z.enum(['draft', 'completed', 'deleted']).optional(),
  deletedAt: z.date().nullable().optional(),
}).partial();

// DTO: Обновление стадии проекта
export const UpdateProjectStageDto = z.object({
  stage: z.number().int().min(1).max(8),
});

// DTO: Массовое создание проектов
export const BatchCreateProjectsDto = z.object({
  articleIds: z.array(z.string().min(1)).min(1),
});

// ============================================================================
// TYPES
// ============================================================================

export type GetProjectsQueryDto = z.infer<typeof GetProjectsQueryDto>;
export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type ItemIdParamDto = z.infer<typeof ItemIdParamDto>;
export type CreateProjectDto = z.infer<typeof CreateProjectDto>;
export type UpdateProjectDto = z.infer<typeof UpdateProjectDto>;
export type UpdateProjectStageDto = z.infer<typeof UpdateProjectStageDto>;
export type BatchCreateProjectsDto = z.infer<typeof BatchCreateProjectsDto>;
