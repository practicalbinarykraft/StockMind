import { z } from "zod";

/**
 * DTO: Route params for project ID
 */
export const ProjectIdParamDto = z.object({
  id: z.string(),
});

/**
 * DTO: Compare versions query params
 */
export const CompareVersionsQueryDto = z.object({
  baseVersionId: z.string(),
  targetVersionId: z.string(),
});

/**
 * DTO: Choose version request
 */
export const ChooseVersionDto = z.object({
  keep: z.enum(["base", "candidate"]),
});

export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type CompareVersionsQueryDto = z.infer<typeof CompareVersionsQueryDto>;
export type ChooseVersionDto = z.infer<typeof ChooseVersionDto>;
