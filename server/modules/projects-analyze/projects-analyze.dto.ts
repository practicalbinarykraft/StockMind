import { z } from "zod";

// ============================================================================
// ROUTE PARAMS
// ============================================================================

// DTO: ID проекта в params
export const ProjectIdParamDto = z.object({
  id: z.string().min(1),
});

// ============================================================================
// RESPONSE
// ============================================================================

// DTO: Анализ источника
export const SourceAnalysisDto = z.object({
  score: z.number(),
  verdict: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  topics: z.array(z.string()),
  sentiment: z.string(),
  keywords: z.array(z.string()),
  viralPotential: z.string(),
});

// DTO: Рекомендованный формат
export const RecommendedFormatDto = z.object({
  formatId: z.string(),
  name: z.string(),
  reason: z.string(),
});

// DTO: Метаданные источника
export const SourceMetadataDto = z.object({
  language: z.string(),
  wordCount: z.number(),
  characterCount: z.number(),
});

// DTO: Метаданные анализа
export const AnalysisMetadataDto = z.object({
  analysisTime: z.number(),
  sourceType: z.string(),
});

// DTO: Ответ анализа источника
export const AnalyzeSourceResponseDto = z.object({
  success: z.boolean(),
  data: z.object({
    analysis: SourceAnalysisDto,
    recommendedFormat: RecommendedFormatDto,
    sourceMetadata: SourceMetadataDto,
    metadata: AnalysisMetadataDto,
  }),
});

// ============================================================================
// TYPES
// ============================================================================

export type ProjectIdParamDto = z.infer<typeof ProjectIdParamDto>;
export type SourceAnalysisDto = z.infer<typeof SourceAnalysisDto>;
export type RecommendedFormatDto = z.infer<typeof RecommendedFormatDto>;
export type SourceMetadataDto = z.infer<typeof SourceMetadataDto>;
export type AnalysisMetadataDto = z.infer<typeof AnalysisMetadataDto>;
export type AnalyzeSourceResponseDto = z.infer<typeof AnalyzeSourceResponseDto>;
