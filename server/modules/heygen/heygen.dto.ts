import { z } from "zod";

// DTO: Get avatars query params (GET /api/heygen/avatars)
export const GetAvatarsQueryDto = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 30)),
});

// DTO: Generate video (POST /api/heygen/generate)
export const GenerateVideoDto = z
  .object({
    avatarId: z.string().min(1, "Avatar ID is required"),
    script: z.string().min(1, "Script is required"),
    audioUrl: z.string().optional(),
    voiceId: z.string().optional(),
    dimension: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
  })
  .refine((data) => data.audioUrl || data.voiceId, {
    message: "Either audioUrl or voiceId is required for HeyGen generation",
  });

// DTO: Video status params (GET /api/heygen/status/:videoId)
export const VideoStatusParamsDto = z.object({
  videoId: z.string().min(1, "Video ID is required"),
});

// DTO: Image proxy query (GET /api/heygen/image-proxy)
export const ImageProxyQueryDto = z.object({
  url: z.string().url("Invalid URL format"),
});

// DTO: Video proxy query (GET /api/heygen/video-proxy)
export const VideoProxyQueryDto = z.object({
  url: z.string().url("Invalid URL format"),
  download: z.string().optional(),
});

export type GetAvatarsQueryDto = z.infer<typeof GetAvatarsQueryDto>;
export type GenerateVideoDto = z.infer<typeof GenerateVideoDto>;
export type VideoStatusParamsDto = z.infer<typeof VideoStatusParamsDto>;
export type ImageProxyQueryDto = z.infer<typeof ImageProxyQueryDto>;
export type VideoProxyQueryDto = z.infer<typeof VideoProxyQueryDto>;
