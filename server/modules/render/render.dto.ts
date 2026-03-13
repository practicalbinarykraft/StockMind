import { z } from 'zod';

export const renderReelSchema = z.object({
  projectId: z.string().uuid(),
  /** Override layout mode (defaults to auto-detect based on b-roll availability) */
  layout: z.enum(['avatar-only', 'avatar-broll-split', 'broll-with-pip']).optional(),
  /** Whether to burn subtitles into the video */
  subtitlesEnabled: z.boolean().optional().default(true),
  /** FPS override */
  fps: z.number().min(24).max(60).optional().default(30),
});

export type RenderReelDto = z.infer<typeof renderReelSchema>;
