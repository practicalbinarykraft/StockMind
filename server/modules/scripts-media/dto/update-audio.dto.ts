import { z } from 'zod';

// ============================================================================
// DTO для обновления только аудио
// ============================================================================

export const UpdateAudioDto = z.object({
  audioUrl: z.string().optional(),
  audioMode: z.enum(['generate', 'upload', 'record']).optional(),
  selectedVoice: z.string().optional(),
  audioFilename: z.string().optional(),
  audioFilesize: z.number().optional(),
  audioGeneratedAt: z.string().optional(),
});

export type UpdateAudioDto = z.infer<typeof UpdateAudioDto>;
