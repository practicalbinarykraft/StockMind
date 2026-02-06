import { z } from 'zod';

// ============================================================================
// DTO для обновления только видео
// ============================================================================

export const UpdateVideoDto = z.object({
  videoUrl: z.string().optional(),
  videoId: z.string().optional(),
  selectedAvatar: z.string().optional(),
  videoDuration: z.number().optional(),
  videoStatus: z.enum(['generating', 'completed', 'failed']).optional(),
  videoThumbnailUrl: z.string().optional(),
  videoErrorMessage: z.string().optional(),
  // videoGeneratedAt создается на сервере автоматически
});

export type UpdateVideoDto = z.infer<typeof UpdateVideoDto>;
