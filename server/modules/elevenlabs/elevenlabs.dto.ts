import { z } from "zod";

// DTO: Generate speech (POST /api/elevenlabs/generate)
export const GenerateSpeechDto = z.object({
  voiceId: z.string().min(1, "Voice ID is required"),
  text: z.string().min(1, "Text is required"),
  voiceSettings: z
    .object({
      stability: z.number().min(0).max(1),
      similarity_boost: z.number().min(0).max(1),
      style: z.number().min(0).max(1).optional(),
      use_speaker_boost: z.boolean().optional(),
    })
    .optional(),
});

export type GenerateSpeechDto = z.infer<typeof GenerateSpeechDto>;
