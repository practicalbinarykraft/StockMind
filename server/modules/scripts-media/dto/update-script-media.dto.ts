import { z } from 'zod';

// ============================================================================
// DTO для создания/обновления scripts_media
// ============================================================================

export const UpdateScriptMediaDto = z.object({
  // Аудио
  audioUrl: z.string().optional(),
  audioMode: z.enum(['generate', 'upload', 'record']).optional(),
  selectedVoice: z.string().optional(),
  audioFilename: z.string().optional(),
  audioFilesize: z.number().optional(),
  audioGeneratedAt: z.string().optional(),
  
  // Видео
  videoUrl: z.string().optional(),
  videoId: z.string().optional(),
  selectedAvatar: z.string().optional(),
  videoDuration: z.number().optional(),
  videoStatus: z.enum(['generating', 'completed', 'failed']).optional(),
  videoThumbnailUrl: z.string().optional(),
  videoGeneratedAt: z.string().optional(),
  videoErrorMessage: z.string().optional(),
});

export type UpdateScriptMediaDto = z.infer<typeof UpdateScriptMediaDto>;
