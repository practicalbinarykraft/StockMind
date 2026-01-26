import { z } from "zod";

/**
 * DTO: Query params for filtering scripts
 */
export const GetScriptsQueryDto = z.object({
  status: z.string().optional(),
  sourceType: z.string().optional(),
  search: z.string().optional(),
});

/**
 * DTO: Route param for script ID
 */
export const ScriptIdParamDto = z.object({
  id: z.string(),
});

/**
 * DTO: Route param for article ID
 */
export const ArticleIdParamDto = z.object({
  id: z.string(),
});

/**
 * DTO: Create script request body
 */
export const CreateScriptDto = z.object({
  title: z.string(),
  scenes: z.array(z.any()),
  fullText: z.string().optional(),
  format: z.string().optional(),
  durationSeconds: z.number().optional(),
  wordCount: z.number().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  sourceTitle: z.string().optional(),
  sourceUrl: z.string().optional(),
  status: z.string().optional().default('draft'),
});

/**
 * DTO: Update script request body
 */
export const UpdateScriptDto = z.object({
  title: z.string().optional(),
  scenes: z.array(z.any()).optional(),
  fullText: z.string().optional(),
  format: z.string().optional(),
  durationSeconds: z.number().optional(),
  wordCount: z.number().optional(),
  status: z.string().optional(),
  aiAnalysis: z.any().optional(),
  aiScore: z.number().optional(),
  analyzedAt: z.date().optional(),
});

/**
 * DTO: Start production request body
 */
export const StartProductionDto = z.object({
  skipToStage: z.number().optional().default(4),
});

/**
 * DTO: Generate script from article request body
 */
export const GenerateScriptFromArticleDto = z.object({
  format: z.string().optional(),
  saveToLibrary: z.boolean().optional().default(true),
});

/**
 * DTO: Generate script variants request body
 */
export const GenerateVariantsDto = z.object({
  sourceText: z.string(),
  prompt: z.string().optional(),
  format: z.string(),
  lengthOption: z.enum(['keep', 'increase', 'decrease']).optional().default('keep'),
});

export type GetScriptsQueryDto = z.infer<typeof GetScriptsQueryDto>;
export type ScriptIdParamDto = z.infer<typeof ScriptIdParamDto>;
export type ArticleIdParamDto = z.infer<typeof ArticleIdParamDto>;
export type CreateScriptDto = z.infer<typeof CreateScriptDto>;
export type UpdateScriptDto = z.infer<typeof UpdateScriptDto>;
export type StartProductionDto = z.infer<typeof StartProductionDto>;
export type GenerateScriptFromArticleDto = z.infer<typeof GenerateScriptFromArticleDto>;
export type GenerateVariantsDto = z.infer<typeof GenerateVariantsDto>;
