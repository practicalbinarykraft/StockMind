import { z } from "zod";
import { insertRssItemSchema } from "@shared/schema";

// ============================================================================
// PARAMS DTO
// ============================================================================

// DTO: Route param - id новости (например, /api/news/:id)
export const NewsIdParamDto = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// BODY DTO
// ============================================================================

// DTO: Создание нового RSS item (используется редко, обычно парсится автоматически)
export const CreateNewsItemDto = insertRssItemSchema;

// DTO: Обновление действия пользователя с новостью (dismiss, select, seen)
export const UpdateNewsActionDto = z.object({
  action: z.enum(['selected', 'dismissed', 'seen']),
  projectId: z.string().uuid().optional(),
});

// DTO: Добавление в избранное с заметками
export const AddToFavoriteDto = z.object({
  notes: z.string().optional(),
});

// DTO: Batch scoring - массив ID статей для оценки
export const BatchScoreDto = z.object({
  itemIds: z.array(z.string().uuid()).min(1, "itemIds array is required"),
});

// DTO: Extended refresh с датами
export const ExtendedRefreshDto = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// QUERY DTO
// ============================================================================

// DTO: Фильтры для /api/news/all (News Hub)
export const NewsFiltersDto = z.object({
  source: z.string().optional(), // ID источника или "all"
  score: z.enum(['all', 'high', 'medium', 'low']).optional(), // Фильтр по score
  sort: z.enum(['date', 'score']).optional(), // Сортировка
});

// ============================================================================
// RESPONSE DTO
// ============================================================================

// DTO: Ответ с информацией о score статьи
export const NewsScoreResponseDto = z.object({
  id: z.string(),
  score: z.number().nullable(),
  aiScore: z.number().nullable(),
  freshnessScore: z.number().nullable(),
  viralityScore: z.number().nullable(),
  aiComment: z.string().nullable(),
});

// DTO: Ответ при обновлении действия
export const UpdateActionResponseDto = z.object({
  success: z.boolean(),
  item: z.any(), // Тип RssItem
});

// DTO: Ответ при refresh/extended-refresh
export const RefreshResponseDto = z.object({
  success: z.boolean(),
  newItems: z.number(),
  totalProcessed: z.number().optional(),
});

// DTO: Ответ при batch scoring
export const BatchScoreResponseDto = z.object({
  success: z.boolean(),
  message: z.string(),
  scoredCount: z.number(),
});

// DTO: Ответ с полным контентом статьи
export const FullContentResponseDto = z.object({
  success: z.boolean(),
  content: z.string().optional(),
  cached: z.boolean().optional(),
  error: z.string().optional(),
  fallback: z.string().optional(),
});

// DTO: Ответ с сохраненным анализом статьи
export const ArticleAnalysisResponseDto = z.object({
  success: z.boolean(),
  data: z.any().optional(), // ArticlePotentialResult
  error: z.string().optional(),
});

// DTO: Простой успешный ответ
export const SuccessResponseDto = z.object({
  success: z.boolean(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type NewsIdParamDto = z.infer<typeof NewsIdParamDto>;
export type CreateNewsItemDto = z.infer<typeof CreateNewsItemDto>;
export type UpdateNewsActionDto = z.infer<typeof UpdateNewsActionDto>;
export type AddToFavoriteDto = z.infer<typeof AddToFavoriteDto>;
export type BatchScoreDto = z.infer<typeof BatchScoreDto>;
export type ExtendedRefreshDto = z.infer<typeof ExtendedRefreshDto>;
export type NewsFiltersDto = z.infer<typeof NewsFiltersDto>;
export type NewsScoreResponseDto = z.infer<typeof NewsScoreResponseDto>;
export type UpdateActionResponseDto = z.infer<typeof UpdateActionResponseDto>;
export type RefreshResponseDto = z.infer<typeof RefreshResponseDto>;
export type BatchScoreResponseDto = z.infer<typeof BatchScoreResponseDto>;
export type FullContentResponseDto = z.infer<typeof FullContentResponseDto>;
export type ArticleAnalysisResponseDto = z.infer<typeof ArticleAnalysisResponseDto>;
export type SuccessResponseDto = z.infer<typeof SuccessResponseDto>;
