import { z } from "zod";

// DTO: Query параметры для получения списка items
export const GetInstagramItemsQueryDto = z.object({
  sourceId: z.string().uuid().optional(),
});

// DTO: Route param — id item'а
export const InstagramItemIdParamDto = z.object({
  id: z.string().uuid(),
});

// DTO: Обновление действия пользователя (action)
export const UpdateItemActionDto = z.object({
  action: z.enum(["selected", "dismissed", "seen"]),
  projectId: z.string().uuid().optional(),
});

// DTO: Query параметры для прокси изображений
export const ProxyImageQueryDto = z.object({
  url: z.string().url(),
});

// DTO: Ответ на запуск транскрипции
export const TranscriptionStartResponse = z.object({
  message: z.string(),
  status: z.string(),
});

// DTO: Ответ на скоринг
export const ScoringResponse = z.object({
  message: z.string(),
  score: z.number(),
  comment: z.string(),
  freshnessScore: z.number().optional(),
  viralityScore: z.number().optional(),
  qualityScore: z.number().optional(),
});

export type GetInstagramItemsQueryDto = z.infer<typeof GetInstagramItemsQueryDto>;
export type InstagramItemIdParamDto = z.infer<typeof InstagramItemIdParamDto>;
export type UpdateItemActionDto = z.infer<typeof UpdateItemActionDto>;
export type ProxyImageQueryDto = z.infer<typeof ProxyImageQueryDto>;
export type TranscriptionStartResponse = z.infer<typeof TranscriptionStartResponse>;
export type ScoringResponse = z.infer<typeof ScoringResponse>;
