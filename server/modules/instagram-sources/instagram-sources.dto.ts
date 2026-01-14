import { z } from "zod";
import { insertInstagramSourceSchema } from "@shared/schema";

// DTO: Создание нового Instagram источника
export const CreateInstagramSourceDto = insertInstagramSourceSchema;

// DTO: Обновление Instagram источника
export const UpdateInstagramSourceDto = z.object({
  username: z.string().optional(),
  profileUrl: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  parseStatus: z.string().optional(),
  parseError: z.string().nullable().optional(),
  autoUpdateEnabled: z.boolean().optional(),
  checkIntervalHours: z.number().optional(),
  notifyNewReels: z.boolean().optional(),
  notifyViralOnly: z.boolean().optional(),
  viralThreshold: z.number().optional(),
  lastScrapedDate: z.date().optional(),
  lastScrapedReelId: z.string().optional(),
});

// DTO: Route param — id источника
export const InstagramSourceIdParamDto = z.object({
  id: z.string().uuid(),
});

// DTO: Запрос на парсинг
export const ParseInstagramSourceDto = z.object({
  resultsLimit: z.number().optional().default(30),
});

// DTO: Ответ при получении/создании Instagram источника
export const InstagramSourceResponse = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  profileUrl: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  lastParsed: z.date().nullable(),
  parseStatus: z.string().nullable(),
  parseError: z.string().nullable(),
  itemCount: z.number(),
  lastScrapedDate: z.date().nullable(),
  lastScrapedReelId: z.string().nullable(),
  autoUpdateEnabled: z.boolean(),
  checkIntervalHours: z.number(),
  lastCheckedAt: z.date().nullable(),
  lastSuccessfulParseAt: z.date().nullable(),
  nextCheckAt: z.date().nullable(),
  totalChecks: z.number(),
  newReelsFound: z.number(),
  failedChecks: z.number(),
  notifyNewReels: z.boolean(),
  notifyViralOnly: z.boolean(),
  viralThreshold: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// DTO: Ответ при получении всех источников
export const InstagramSourcesListResponse = z.array(InstagramSourceResponse);

// DTO: Ответ на парсинг
export const ParseResponse = z.object({
  success: z.boolean(),
  itemCount: z.number().optional(),
  savedCount: z.number().optional(),
  skippedCount: z.number().optional(),
  message: z.string().optional(),
});

// DTO: Ответ на проверку новых рилс
export const CheckNowResponse = z.object({
  success: z.boolean(),
  newReelsCount: z.number(),
  viralReelsCount: z.number(),
  message: z.string(),
});

// DTO: Ответ на получение лимитов
export const LimitsResponse = z.object({
  limits: z.object({
    autoParseOnAdd: z.number(),
    checkNow: z.number(),
    maxAutoScore: z.number(),
  }),
  queue: z.any(),
});

export type CreateInstagramSourceDto = z.infer<typeof CreateInstagramSourceDto>;
export type UpdateInstagramSourceDto = z.infer<typeof UpdateInstagramSourceDto>;
export type InstagramSourceIdParamDto = z.infer<typeof InstagramSourceIdParamDto>;
export type ParseInstagramSourceDto = z.infer<typeof ParseInstagramSourceDto>;
export type InstagramSourceResponse = z.infer<typeof InstagramSourceResponse>;
export type InstagramSourcesListResponse = z.infer<typeof InstagramSourcesListResponse>;
export type ParseResponse = z.infer<typeof ParseResponse>;
export type CheckNowResponse = z.infer<typeof CheckNowResponse>;
export type LimitsResponse = z.infer<typeof LimitsResponse>;
