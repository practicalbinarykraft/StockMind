/**
 * Kie.ai module types for image/video generation.
 * API: https://docs.kie.ai/
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
  duration?: number; // seconds
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

export interface KieAiTaskResponse {
  task_id: string;
  status?: string;
  [key: string]: unknown;
}

export interface KieAiJobStatusResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: { url?: string; urls?: string[] };
  error_message?: string;
  [key: string]: unknown;
}
