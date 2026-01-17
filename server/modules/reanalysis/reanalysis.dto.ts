import { z } from "zod";

/**
 * DTO: Route params for project ID
 */
export const ProjectIdParamDto = z.object({
  id: z.string(),
});

/**
 * DTO: Start reanalysis request
 */
export const StartReanalysisDto = z.object({
  idempotencyKey: z.string().optional(),
});

/**
 * DTO: Check status query
 */
export const CheckStatusQueryDto = z.object({
  jobId: z.string(),
});

export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type StartReanalysisDto = z.infer<typeof StartReanalysisDto>;
export type CheckStatusQueryDto = z.infer<typeof CheckStatusQueryDto>;
