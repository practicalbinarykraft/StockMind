import { z } from "zod";
import { insertApiKeySchema } from "@shared/schema";


// DTO: Создание нового API ключа
export const CreateApiKeyDto = insertApiKeySchema;

// DTO: Ответ при получении/создании API ключа (без decryptedKey)
export const ApiKeyResponse = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.string(),
  last4: z.string().nullable(),           // Может быть null если last4 не задан
  description: z.string().nullable(),     // Может быть null
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// DTO: Ответ при получении всех ключей пользователя
export const ApiKeysListResponse = z.array(ApiKeyResponse);

// DTO: Ответ с расшифрованным ключом (для getDecryptedById)
export const ApiKeyWithDecryptedResponse = ApiKeyResponse.extend({
  encryptedKey: z.string(),
  decryptedKey: z.string(), // Только для getDecryptedById
});

// DTO: Обновление ключа — можно передавать только updatable поля
export const UpdateApiKeyDto = z.object({
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// DTO: Route param — id ключа (например, /api-keys/:id)
export const ApiKeyIdParamDto = z.object({
  id: z.string().uuid(),
});

export type CreateApiKeyDto = z.infer<typeof CreateApiKeyDto>;
export type ApiKeyResponse = z.infer<typeof ApiKeyResponse>;
export type ApiKeysListResponse = z.infer<typeof ApiKeysListResponse>;
export type ApiKeyWithDecryptedResponse = z.infer<typeof ApiKeyWithDecryptedResponse>;
export type UpdateApiKeyDto = z.infer<typeof UpdateApiKeyDto>;
export type ApiKeyIdParamDto = z.infer<typeof ApiKeyIdParamDto>;
