import { z } from "zod";
import { insertRssSourceSchema } from "@shared/schema";

// DTO: Создание нового RSS источника
export const CreateRssSourceDto = insertRssSourceSchema;

// DTO: Обновление RSS источника
export const UpdateRssSourceDto = z.object({
  name: z.string().optional(),
  url: z.string().url().optional(),
  topic: z.string().optional(),
  isActive: z.boolean().optional(),
  parseStatus: z.string().optional(),
  parseError: z.string().nullable().optional(),
});

// DTO: Route param — id источника
export const RssSourceIdParamDto = z.object({
  id: z.string().uuid(),
});

// DTO: Ответ при получении/создании RSS источника
export const RssSourceResponse = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  url: z.string(),
  topic: z.string().nullable(),
  isActive: z.boolean(),
  lastParsed: z.date().nullable(),
  parseStatus: z.string().nullable(),
  parseError: z.string().nullable(),
  itemCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// DTO: Ответ при получении всех источников
export const RssSourcesListResponse = z.array(RssSourceResponse);

// DTO: Ответ на запрос парсинга
export const ParseTriggerResponse = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type CreateRssSourceDto = z.infer<typeof CreateRssSourceDto>;
export type UpdateRssSourceDto = z.infer<typeof UpdateRssSourceDto>;
export type RssSourceIdParamDto = z.infer<typeof RssSourceIdParamDto>;
export type RssSourceResponse = z.infer<typeof RssSourceResponse>;
export type RssSourcesListResponse = z.infer<typeof RssSourcesListResponse>;
export type ParseTriggerResponse = z.infer<typeof ParseTriggerResponse>;
