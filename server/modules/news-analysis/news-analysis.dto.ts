import { z } from "zod";

/**
 * DTO для перевода текста статьи
 */
export const TranslateArticleBodyDto = z.object({
  text: z.string().min(1, "Text cannot be empty"),
  articleId: z.string().uuid().optional(),
});

/**
 * DTO для анализа статьи
 */
export const AnalyzeArticleBodyDto = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  content: z.string().min(1, "Content cannot be empty"),
  articleId: z.string().uuid().optional(),
});

/**
 * DTO для одной статьи в пакетном анализе
 */
export const BatchArticleItemDto = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  content: z.string().optional(),
});

/**
 * DTO для пакетного анализа статей
 */
export const AnalyzeBatchBodyDto = z.object({
  articles: z.array(BatchArticleItemDto).min(1, "Articles array cannot be empty"),
});

/**
 * DTO для ответа на запрос перевода
 */
export const TranslationResponseDto = z.object({
  original: z.string(),
  translated: z.string(),
  language: z.string(),
});

/**
 * DTO для ответа на запрос анализа
 */
export const AnalysisResponseDto = z.object({
  score: z.number(),
  verdict: z.string(),
  breakdown: z.any(),
  metadata: z.object({
    analysisTime: z.number(),
    timestamp: z.string(),
  }),
});

/**
 * DTO для результата анализа одной статьи в пакете
 */
export const BatchAnalysisResultDto = z.object({
  articleId: z.string(),
  analysis: z.any().nullable(),
  error: z.string().optional(),
});

/**
 * DTO для ответа на пакетный анализ
 */
export const BatchAnalysisResponseDto = z.object({
  results: z.array(BatchAnalysisResultDto),
  metadata: z.object({
    totalArticles: z.number(),
    successful: z.number(),
    failed: z.number(),
    analysisTime: z.number(),
    timestamp: z.string(),
  }),
});

export type TranslationResponseDto = z.infer<typeof TranslationResponseDto>;
export type TranslateArticleBodyDto = z.infer<typeof TranslateArticleBodyDto>;
export type BatchAnalysisResponseDto = z.infer<typeof BatchAnalysisResponseDto>;
export type AnalysisResponseDto = z.infer<typeof AnalysisResponseDto>;
export type BatchAnalysisResultDto = z.infer<typeof BatchAnalysisResultDto>;
export type AnalyzeBatchBodyDto = z.infer<typeof AnalyzeBatchBodyDto>;
export type BatchArticleItemDto = z.infer<typeof BatchArticleItemDto>;
export type AnalyzeArticleBodyDto = z.infer<typeof AnalyzeArticleBodyDto>;