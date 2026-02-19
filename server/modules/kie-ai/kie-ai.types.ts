/**
 * Kie.ai module types for image/video generation.
 * API: https://docs.kie.ai/
 *
 * Internal model names are mapped to Kie.ai API model identifiers
 * in kie-ai.service.ts (MODEL_MAP).
 */

export type KieModel =
  | "flux-pro"
  | "nano-banana-pro"
  | "recraft-v3"
  | "flux-schnell"
  | "kling-ai-video"
  | "kling-ai-i2v";

export type GenerationStatus = "pending" | "processing" | "ready" | "failed";

export interface TextToImageRequest {
  prompt: string;
  model: KieModel;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  numImages?: number;
}

export interface TextToVideoRequest {
  prompt: string;
  model: "kling-ai-video";
  duration?: number;
  aspectRatio?: "16:9" | "9:16";
}

export interface ImageToVideoRequest {
  imageUrl: string;
  prompt?: string;
  model: "kling-ai-i2v";
  duration?: number;
}

export interface GenerationJob {
  id: string;
  type: "image" | "video";
  status: GenerationStatus;
  resultUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}
