import { generateAiPrompt } from "../../ai-services";
import { generateKieVideo, getKieVideoStatus } from "../../services/kie-service";
import { logger } from "../../lib/logger";
import { apiKeysService } from "../api-keys/api-keys.service";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";
import { ProjectsService } from "../projects/projects.service";
import {
  AnthropicApiKeyNotFoundError,
  KieaiApiKeyNotFoundError,
  GeneratePromptError,
  GenerateBrollError,
  BrollStatusError,
} from "./broll.errors";
import type { GeneratePromptBodyDto, GenerateBrollBodyDto } from "./broll.dto";

/**
 * B-Roll Service
 * Бизнес-логика для генерации B-roll видео
 */
export class BrollService {
  private projectsService: ProjectsService;

  constructor() {
    this.projectsService = new ProjectsService();
  }

  /**
   * Проверить доступ к проекту
   */
  private async verifyProjectAccess(projectId: string, userId: string): Promise<void> {
    await this.projectsService.getProjectById(projectId, userId);
  }

  /**
   * Получить Anthropic API ключ
   */
  private async getAnthropicApiKey(userId: string): Promise<string> {
    try {
      const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
      return apiKey.decryptedKey;
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        throw new AnthropicApiKeyNotFoundError();
      }
      throw error;
    }
  }

  /**
   * Получить Kie.ai API ключ
   */
  private async getKieaiApiKey(userId: string): Promise<string> {
    try {
      const apiKey = await apiKeysService.getUserApiKey(userId, "kieai");
      return apiKey.decryptedKey;
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        throw new KieaiApiKeyNotFoundError();
      }
      throw error;
    }
  }

  /**
   * Сгенерировать AI промпт для B-roll
   */
  async generatePrompt(projectId: string, userId: string, dto: GeneratePromptBodyDto) {
    const { shotInstructions, sceneText } = dto;

    await this.verifyProjectAccess(projectId, userId);

    const apiKey = await this.getAnthropicApiKey(userId);

    logger.info(`[B-Roll] Generating AI prompt for project ${projectId}...`);

    try {
      const aiPrompt = await generateAiPrompt(apiKey, shotInstructions, sceneText);
      return { aiPrompt };
    } catch (error: any) {
      logger.error("Error generating AI prompt:", { error: error.message });
      throw new GeneratePromptError(error.message);
    }
  }

  /**
   * Сгенерировать B-roll видео
   */
  async generateBroll(projectId: string, userId: string, dto: GenerateBrollBodyDto) {
    const { sceneId, aiPrompt, model, aspectRatio } = dto;

    await this.verifyProjectAccess(projectId, userId);

    const apiKey = await this.getKieaiApiKey(userId);

    // Idempotency: generate stable request ID
    const finalModel = model || "veo3_fast";
    const finalAspectRatio = aspectRatio || "9:16";
    const { generateIdempotencyKey } = await import("../../lib/idempotency");
    const idempotencyKey = generateIdempotencyKey({
      projectId,
      sceneId,
      prompt: aiPrompt,
      model: finalModel,
      aspectRatio: finalAspectRatio,
    });

    logger.info(`[B-Roll] Generating video for project ${projectId}, scene ${sceneId} (requestId: ${idempotencyKey})...`);

    try {
      const taskId = await generateKieVideo(apiKey, {
        prompt: aiPrompt,
        model: finalModel,
        aspectRatio: finalAspectRatio,
        requestId: idempotencyKey,
      });

      return { taskId, reused: false };
    } catch (error: any) {
      logger.error("Error generating B-Roll:", { error });

      const status = error.statusCode || error.response?.status || 500;
      const apiMessage = error.apiMessage || error.message;

      throw new GenerateBrollError(
        error.message || "Failed to generate B-Roll video",
        status,
        apiMessage
      );
    }
  }

  /**
   * Получить статус генерации B-roll видео
   */
  async getBrollStatus(projectId: string, taskId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const apiKey = await this.getKieaiApiKey(userId);

    logger.info(`[B-Roll] Checking status for task ${taskId} (project ${projectId})`);

    try {
      const status = await getKieVideoStatus(apiKey, taskId);
      return status;
    } catch (error: any) {
      logger.error("Error checking B-Roll status:", { error });

      const statusCode = error.statusCode || error.response?.status || 500;
      const apiMessage = error.apiMessage || error.message;

      throw new BrollStatusError(error.message || "Failed to check video status", statusCode, apiMessage);
    }
  }
}

export const brollService = new BrollService();
