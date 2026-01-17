import { z } from "zod";

/**
 * DTO: Route params for project ID
 */
export const ProjectIdParamDto = z.object({
  id: z.string(),
});

/**
 * DTO: Apply single scene recommendation
 */
export const ApplySceneRecommendationDto = z.object({
  recommendationId: z.string(),
});

/**
 * DTO: Apply all recommendations
 */
export const ApplyAllRecommendationsDto = z.object({
  recommendationIds: z.array(z.string()).optional(),
});

/**
 * DTO: Edit scene manually
 */
export const EditSceneDto = z.object({
  sceneId: z.number(),
  newText: z.string(),
});

/**
 * DTO: Revert to version
 */
export const RevertToVersionDto = z.object({
  versionId: z.string(),
});

/**
 * DTO: Run analysis
 */
export const RunAnalysisDto = z.object({
  scenes: z.array(z.any()),
});

export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type ApplySceneRecommendationDto = z.infer<typeof ApplySceneRecommendationDto>;
export type ApplyAllRecommendationsDto = z.infer<typeof ApplyAllRecommendationsDto>;
export type EditSceneDto = z.infer<typeof EditSceneDto>;
export type RevertToVersionDto = z.infer<typeof RevertToVersionDto>;
export type RunAnalysisDto = z.infer<typeof RunAnalysisDto>;
