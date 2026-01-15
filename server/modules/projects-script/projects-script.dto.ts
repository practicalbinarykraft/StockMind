import { z } from "zod";

// ============================================================================
// ROUTE PARAMS
// ============================================================================

// DTO: ID проекта в params
export const ProjectIdParamDto = z.object({
  id: z.string().min(1),
});

// ============================================================================
// REQUEST BODY
// ============================================================================

// DTO: Генерация скрипта
export const GenerateScriptBodyDto = z.object({
  formatId: z.string().min(1),
  targetLocale: z.string().optional().default('ru'),
});

// ============================================================================
// RESPONSE
// ============================================================================

// DTO: Сцена скрипта
export const SceneDto = z.object({
  id: z.number(),
  sceneNumber: z.number(),
  text: z.string(),
  score: z.number(),
  variants: z.array(z.string()),
  start: z.number(),
  end: z.number(),
});

// DTO: Анализ скрипта
export const ScriptAnalysisDto = z.object({
  scriptScore: z.number().optional(),
  advancedScore: z.number().optional(),
  finalScore: z.number(),
  verdict: z.string().optional(),
  hookScore: z.number().optional(),
  structureScore: z.number().optional(),
  emotionalScore: z.number().optional(),
  ctaScore: z.number().optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
});

// DTO: Ответ генерации скрипта
export const GenerateScriptResponseDto = z.object({
  success: z.boolean(),
  data: z.object({
    version: z.any(), // ScriptVersion from DB
    formatName: z.string(),
    scenesCount: z.number(),
    recommendationsCount: z.number(),
    analysis: ScriptAnalysisDto,
  }).optional(),
  error: z.string().optional(),
  code: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  message: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type GenerateScriptBodyDto = z.infer<typeof GenerateScriptBodyDto>;
export type SceneDto = z.infer<typeof SceneDto>;
export type ScriptAnalysisDto = z.infer<typeof ScriptAnalysisDto>;
export type GenerateScriptResponseDto = z.infer<typeof GenerateScriptResponseDto>;
