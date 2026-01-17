import { z } from "zod";

// DTO для загрузки аудио (валидация файла происходит в multer)
// Здесь определяем типы для response
export const AudioUploadResponseDto = z.object({
  success: z.boolean(),
  filename: z.string(),
  audioUrl: z.string(),
  size: z.number(),
  mimetype: z.string(),
});

export type AudioUploadResponseDto = z.infer<typeof AudioUploadResponseDto>;
