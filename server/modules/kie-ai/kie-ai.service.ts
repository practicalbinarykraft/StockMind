import { logger } from "../../lib/logger";
import { StorageRepo } from "../storage/storage.repo";
import type {
  TextToImageRequest,
  TextToVideoRequest,
  ImageToVideoRequest,
  GenerationJob,
  GenerationStatus,
} from "./kie-ai.types";

const storageRepo = new StorageRepo();

/**
 * Kie.ai API base URL (from docs)
 */
const KIE_AI_BASE = process.env.KIE_AI_API_URL ?? "https://api.kie.ai";

function getApiKey(): string {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) {
    throw new Error("KIE_AI_API_KEY is not set");
  }
  return key;
}

async function kieRequest<T>(
  path: string,
  options: { method: string; body?: object }
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${KIE_AI_BASE}${path}`;
  const res = await fetch(url, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kie.ai API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Save buffer to R2 with a custom path.
 * Path format: users/{userId}/projects/{projectId}/scenes/{sceneId}/{layerType}/{timestamp}-{uuid}.ext
 */
export async function saveToR2(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  return storageRepo.uploadWithPath(buffer, path, contentType);
}

export const kieAiService = {
  async generateImage(request: TextToImageRequest): Promise<GenerationJob> {
    const taskId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      if (process.env.KIE_AI_API_KEY) {
        const body: Record<string, unknown> = {
          prompt: request.prompt,
          model: request.model,
          num_images: request.numImages ?? 1,
        };
        if (request.aspectRatio) {
          body.aspect_ratio = request.aspectRatio;
        }
        const result = await kieRequest<{ task_id: string }>("/v1/generate/image", {
          method: "POST",
          body: body as object,
        });
        return {
          id: result.task_id ?? taskId,
          type: "image",
          status: "pending",
          createdAt: new Date(),
        };
      }
    } catch (e) {
      logger.warn("Kie.ai generateImage API call failed, returning stub job", { error: (e as Error).message });
    }
    return {
      id: taskId,
      type: "image",
      status: "pending",
      createdAt: new Date(),
    };
  },

  async generateVideo(request: TextToVideoRequest): Promise<GenerationJob> {
    const taskId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      if (process.env.KIE_AI_API_KEY) {
        const body: Record<string, unknown> = {
          prompt: request.prompt,
          model: request.model,
          duration: request.duration ?? 5,
        };
        if (request.aspectRatio) body.aspect_ratio = request.aspectRatio;
        const result = await kieRequest<{ task_id: string }>("/v1/generate/video", {
          method: "POST",
          body: body as object,
        });
        return {
          id: result.task_id ?? taskId,
          type: "video",
          status: "pending",
          createdAt: new Date(),
        };
      }
    } catch (e) {
      logger.warn("Kie.ai generateVideo API call failed, returning stub job", { error: (e as Error).message });
    }
    return {
      id: taskId,
      type: "video",
      status: "pending",
      createdAt: new Date(),
    };
  },

  async imageToVideo(request: ImageToVideoRequest): Promise<GenerationJob> {
    const taskId = `i2v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      if (process.env.KIE_AI_API_KEY) {
        const result = await kieRequest<{ task_id: string }>("/v1/generate/image-to-video", {
          method: "POST",
          body: {
            image_url: request.imageUrl,
            prompt: request.prompt,
            model: request.model,
            duration: request.duration ?? 5,
          },
        });
        return {
          id: result.task_id ?? taskId,
          type: "video",
          status: "pending",
          createdAt: new Date(),
        };
      }
    } catch (e) {
      logger.warn("Kie.ai imageToVideo API call failed, returning stub job", { error: (e as Error).message });
    }
    return {
      id: taskId,
      type: "video",
      status: "pending",
      createdAt: new Date(),
    };
  },

  async checkJobStatus(jobId: string): Promise<GenerationJob> {
    try {
      if (process.env.KIE_AI_API_KEY) {
        const result = await kieRequest<{
          task_id: string;
          status: string;
          result?: { url?: string; urls?: string[] };
          error_message?: string;
        }>(`/v1/tasks/${jobId}`, { method: "GET" });
        const status = mapKieStatus(result.status);
        const resultUrl = result.result?.url ?? result.result?.urls?.[0];
        return {
          id: result.task_id,
          type: resultUrl?.match(/\.(mp4|webm)$/i) ? "video" : "image",
          status,
          resultUrl,
          errorMessage: result.error_message,
          createdAt: new Date(),
          completedAt: status === "ready" || status === "failed" ? new Date() : undefined,
        };
      }
    } catch (e) {
      logger.warn("Kie.ai checkJobStatus failed", { jobId, error: (e as Error).message });
    }
    return {
      id: jobId,
      type: "image",
      status: "pending",
      createdAt: new Date(),
    };
  },
};

function mapKieStatus(s: string): GenerationStatus {
  if (s === "completed") return "ready";
  if (s === "pending" || s === "processing" || s === "failed") return s as GenerationStatus;
  return "pending";
}
