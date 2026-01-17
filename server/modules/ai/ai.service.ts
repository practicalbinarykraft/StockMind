import { analyzeScript, scoreText } from "../../ai-services";
import { logger } from "../../lib/logger";
import { apiKeysService } from "../api-keys/api-keys.service";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";
import {
  AnthropicApiKeyNotFoundError,
  InvalidAnthropicApiKeyError,
  AiAnalysisError,
} from "./ai.errors";
import type { AnalyzeScriptDto, ScoreTextDto } from "./ai.dto";

/**
 * AI Service
 * Вся бизнес-логика для AI анализа
 */
export class AiService {
  /**
   * Анализировать скрипт с помощью AI
   */
  async analyzeScript(userId: string, dto: AnalyzeScriptDto) {
    const { format, content } = dto;

    // Get user's Anthropic API key via api-keys service
    let apiKey;
    try {
      apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        throw new AnthropicApiKeyNotFoundError();
      }
      throw error;
    }

    const decryptedKey = apiKey.decryptedKey;

    logger.debug("Analyzing script", { format });

    try {
      const analysis = await analyzeScript(decryptedKey, format, content);
      return analysis;
    } catch (error: any) {
      // Check for authentication errors from Anthropic
      if (error.message?.includes("invalid x-api-key") || error.message?.includes("authentication")) {
        throw new InvalidAnthropicApiKeyError();
      }
      
      logger.error("Error analyzing script", { error: error.message });
      throw new AiAnalysisError("Failed to analyze script");
    }
  }

  /**
   * Оценить текст с помощью AI
   */
  async scoreText(userId: string, dto: ScoreTextDto) {
    const { text } = dto;

    // Get user's Anthropic API key via api-keys service
    let apiKey;
    try {
      apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        throw new AnthropicApiKeyNotFoundError();
      }
      throw error;
    }

    const decryptedKey = apiKey.decryptedKey;

    logger.debug("Scoring text", { textLength: text.length });

    try {
      const result = await scoreText(decryptedKey, text);
      return result;
    } catch (error: any) {
      logger.error("Error scoring text", { error: error.message });
      throw new AiAnalysisError("Failed to score text");
    }
  }
}

export const aiService = new AiService();
