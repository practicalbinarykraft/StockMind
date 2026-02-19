import { logger } from "../../lib/logger";
import { StorageRepo } from "../storage/storage.repo";
import { apiKeysService } from "../api-keys/api-keys.service";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";
import type {
  TextToImageRequest,
  TextToVideoRequest,
  ImageToVideoRequest,
  GenerationJob,
  GenerationStatus,
  KieModel,
} from "./kie-ai.types";

const storageRepo = new StorageRepo();

const KIE_AI_BASE = process.env.KIE_AI_API_URL ?? "https://api.kie.ai";

/**
 * Mapping from internal model names to Kie.ai API model identifiers.
 * Docs: https://docs.kie.ai/market/quickstart
 */
const MODEL_MAP: Record<KieModel, string> = {
  "flux-pro": "flux-2/pro-text-to-image",
  "nano-banana-pro": "google/nano-banana",
  "recraft-v3": "qwen/text-to-image",
  "flux-schnell": "flux-2/flex-text-to-image",
  "kling-ai-video": "kling-2.6/text-to-video",
  "kling-ai-i2v": "kling-2.6/image-to-video",
};

async function resolveApiKey(userId: string): Promise<string> {
  try {
    const keyRecord = await apiKeysService.getUserApiKey(userId, "kieai");
    return keyRecord.decryptedKey;
  } catch (e) {
    if (e instanceof ApiKeyNotFoundError) {
      throw new Error("Kie.ai API key not found. Please add your key in Settings → API Keys.");
    }
    throw e;
  }
}

interface KieApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

async function kieRequest<T>(
  apiKey: string,
  path: string,
  options: { method: string; body?: object },
): Promise<KieApiResponse<T>> {
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
  const json = (await res.json()) as KieApiResponse<T>;
  if (json.code !== 200) {
    throw new Error(`Kie.ai API error code ${json.code}: ${json.msg}`);
  }
  return json;
}

function resolveModel(model: KieModel): string {
  const mapped = MODEL_MAP[model];
  if (!mapped) {
    throw new Error(`Unknown Kie.ai model: ${model}`);
  }
  return mapped;
}

/**
 * Save buffer to R2 with a custom path.
 */
export async function saveToR2(
  buffer: Buffer,
  path: string,
  contentType: string,
): Promise<string> {
  return storageRepo.uploadWithPath(buffer, path, contentType);
}

export const kieAiService = {
  async generateImage(userId: string, request: TextToImageRequest): Promise<GenerationJob> {
    const apiKey = await resolveApiKey(userId);
    const apiModel = resolveModel(request.model);
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio ?? "1:1",
      resolution: request.resolution ?? "1K",
    };

    const result = await kieRequest<{ taskId: string }>(
      apiKey,
      "/api/v1/jobs/createTask",
      {
        method: "POST",
        body: { model: apiModel, input },
      },
    );

    return {
      id: result.data.taskId,
      type: "image",
      status: "pending",
      createdAt: new Date(),
    };
  },

  async generateVideo(userId: string, request: TextToVideoRequest): Promise<GenerationJob> {
    const apiKey = await resolveApiKey(userId);
    const apiModel = resolveModel(request.model as KieModel);
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      duration: String(request.duration ?? 5),
      sound: false,
    };
    if (request.aspectRatio) {
      input.aspect_ratio = request.aspectRatio;
    }

    const result = await kieRequest<{ taskId: string }>(
      apiKey,
      "/api/v1/jobs/createTask",
      {
        method: "POST",
        body: { model: apiModel, input },
      },
    );

    return {
      id: result.data.taskId,
      type: "video",
      status: "pending",
      createdAt: new Date(),
    };
  },

  async imageToVideo(userId: string, request: ImageToVideoRequest): Promise<GenerationJob> {
    const apiKey = await resolveApiKey(userId);
    const apiModel = resolveModel(request.model as KieModel);
    const input: Record<string, unknown> = {
      image_url: request.imageUrl,
      duration: String(request.duration ?? 5),
    };
    if (request.prompt) {
      input.prompt = request.prompt;
    }

    const result = await kieRequest<{ taskId: string }>(
      apiKey,
      "/api/v1/jobs/createTask",
      {
        method: "POST",
        body: { model: apiModel, input },
      },
    );

    return {
      id: result.data.taskId,
      type: "video",
      status: "pending",
      createdAt: new Date(),
    };
  },

  async checkJobStatus(userId: string, jobId: string): Promise<GenerationJob> {
    const apiKey = await resolveApiKey(userId);

    try {
      const result = await kieRequest<{
        taskId: string;
        state: string;
        model?: string;
        resultJson?: string;
        failCode?: string;
        failMsg?: string;
      }>(apiKey, `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(jobId)}`, {
        method: "GET",
      });

      const taskData = result.data;

      logger.info("Kie.ai job status response", {
        taskId: jobId,
        state: taskData.state,
        model: taskData.model,
        failCode: taskData.failCode,
        failMsg: taskData.failMsg,
        hasResultJson: !!taskData.resultJson,
      });

      const status = mapKieStatus(taskData.state);

      let resultUrl: string | undefined;
      if (taskData.resultJson) {
        try {
          const parsed = JSON.parse(taskData.resultJson);
          resultUrl = parsed.resultUrls?.[0];
        } catch {
          logger.warn("Failed to parse resultJson", { taskId: jobId, resultJson: taskData.resultJson });
        }
      }

      const isVideo = taskData.model?.includes("video") ||
        (resultUrl?.match(/\.(mp4|webm)$/i) != null);

      return {
        id: taskData.taskId,
        type: isVideo ? "video" : "image",
        status,
        resultUrl,
        errorMessage: taskData.failMsg || undefined,
        createdAt: new Date(),
        completedAt: status === "ready" || status === "failed" ? new Date() : undefined,
      };
    } catch (e) {
      logger.error("Kie.ai checkJobStatus failed", { jobId, error: (e as Error).message });
      return {
        id: jobId,
        type: "image",
        status: "failed",
        errorMessage: (e as Error).message,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    }
  },
};

function mapKieStatus(state: string): GenerationStatus {
  switch (state) {
    case "success":
      return "ready";
    case "fail":
    case "failed":
      return "failed";
    case "generating":
      return "processing";
    case "waiting":
    case "queuing":
      return "pending";
    default:
      logger.warn("Unknown Kie.ai task state, treating as failed", { state });
      return "failed";
  }
}
