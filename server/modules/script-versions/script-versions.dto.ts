import { z } from "zod";

/**
 * DTO: Route params for project ID
 */
export const ProjectIdParamDto = z.object({
  id: z.string(),
});

/**
 * DTO: Route params for version ID
 */
export const VersionIdParamDto = z.object({
  versionId: z.string(),
});

/**
 * DTO: Combined params for project and version
 */
export const ProjectVersionParamsDto = z.object({
  id: z.string(),
  versionId: z.string(),
});

/**
 * DTO: Create initial version request body
 */
export const CreateInitialVersionDto = z.object({
  scenes: z.any(), // scenes array
  analysisResult: z.any().optional(), // advanced analysis result
  analysisScore: z.number().optional(), // overall score
});

/**
 * DTO: Accept version request
 */
export const AcceptVersionDto = z.object({
  versionId: z.string(),
});

export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type VersionIdParamDto = z.infer<typeof VersionIdParamDto>;
export type ProjectVersionParamsDto = z.infer<typeof ProjectVersionParamsDto>;
export type CreateInitialVersionDto = z.infer<typeof CreateInitialVersionDto>;
export type AcceptVersionDto = z.infer<typeof AcceptVersionDto>;
