import {
  scoreNewsItem,
  scoreInstagramReel,
  scoreNewsAdvanced,
  scoreReelAdvanced,
  scoreCustomScriptAdvanced,
} from "../../ai-services";
import { logger } from "../../lib/logger";
import { apiKeysService } from "../api-keys/api-keys.service";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";
import {
  AnthropicApiKeyNotFoundError,
  AdvancedAnalysisError,
  ComparisonError,
} from "./advanced-analysis.errors";
import type {
  AnalyzeAdvancedNewsDto,
  AnalyzeAdvancedReelDto,
  AnalyzeAdvancedScriptDto,
  CompareAnalysisDto,
} from "./advanced-analysis.dto";

/**
 * Advanced Analysis Service
 * Вся бизнес-логика для продвинутого анализа контента
 */
export class AdvancedAnalysisService {
  /**
   * Получить расшифрованный Anthropic API ключ
   */
  private async getDecryptedApiKey(userId: string): Promise<string> {
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
   * Продвинутый анализ новостей с мульти-агентной системой
   */
  async analyzeNews(userId: string, dto: AnalyzeAdvancedNewsDto) {
    const { title, content } = dto;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Analyzing news with multi-agent system");
    logger.warn("Using deprecated scoreNewsAdvanced(). Consider using analyzeArticlePotential() for articles.");

    const startTime = Date.now();

    try {
      // TODO: Migrate to analyzeArticlePotential() for articles
      const result = await scoreNewsAdvanced(decryptedKey, title, content);
      const duration = Date.now() - startTime;

      logger.debug("Advanced AI analysis completed", { durationMs: duration });

      return {
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error("Error in advanced news analysis", { error: error.message });
      throw new AdvancedAnalysisError("Failed to analyze news content");
    }
  }

  /**
   * Продвинутый анализ Instagram Reel с мульти-агентной системой
   */
  async analyzeReel(userId: string, dto: AnalyzeAdvancedReelDto) {
    const { transcription, caption } = dto;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Analyzing Instagram Reel with multi-agent system");

    const startTime = Date.now();

    try {
      const result = await scoreReelAdvanced(decryptedKey, transcription, caption || null);
      const duration = Date.now() - startTime;

      logger.debug("Reel analysis completed", { durationMs: duration });

      return {
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error("Error in advanced reel analysis", { error: error.message });
      throw new AdvancedAnalysisError("Failed to analyze reel content");
    }
  }

  /**
   * Продвинутый анализ пользовательского скрипта с мульти-агентной системой
   */
  async analyzeScript(userId: string, dto: AnalyzeAdvancedScriptDto) {
    const { text, format, scenes } = dto;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Analyzing custom script with multi-agent system");

    const startTime = Date.now();

    try {
      const result = await scoreCustomScriptAdvanced(
        decryptedKey,
        text,
        format || "short-form",
        scenes
      );
      const duration = Date.now() - startTime;

      logger.debug("Script analysis completed", { durationMs: duration });

      return {
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error("Error in advanced script analysis", { error: error.message });
      throw new AdvancedAnalysisError("Failed to analyze script");
    }
  }

  /**
   * Сравнение старой и новой систем анализа
   */
  async compareAnalysis(userId: string, dto: CompareAnalysisDto) {
    const { type, title, content, transcription, caption } = dto;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Running comparison between old and new analysis systems");

    try {
      let oldResult: any;
      let newResult: any;

      if (type === "news") {
        const startOld = Date.now();
        oldResult = await scoreNewsItem(decryptedKey, title!, content!);
        const oldDuration = Date.now() - startOld;

        const startNew = Date.now();
        // TODO: Migrate to analyzeArticlePotential() for articles
        newResult = await scoreNewsAdvanced(decryptedKey, title!, content!);
        const newDuration = Date.now() - startNew;

        return {
          comparison: {
            old: {
              result: oldResult,
              duration: oldDuration,
            },
            new: {
              result: newResult,
              duration: newDuration,
            },
            scoreDifference: newResult.overallScore - oldResult.score,
            detailImprovement: {
              oldFields: Object.keys(oldResult).length,
              newFields: Object.keys(newResult).length,
              newBreakdowns: Object.keys(newResult.breakdown || {}).length,
            },
          },
        };
      } else if (type === "reel") {
        const startOld = Date.now();
        oldResult = await scoreInstagramReel(decryptedKey, transcription!, caption || null);
        const oldDuration = Date.now() - startOld;

        const startNew = Date.now();
        newResult = await scoreReelAdvanced(decryptedKey, transcription!, caption || null);
        const newDuration = Date.now() - startNew;

        return {
          comparison: {
            old: {
              result: oldResult,
              duration: oldDuration,
            },
            new: {
              result: newResult,
              duration: newDuration,
            },
            scoreDifference: newResult.overallScore - oldResult.score,
            detailImprovement: {
              oldFields: Object.keys(oldResult).length,
              newFields: Object.keys(newResult).length,
              newBreakdowns: Object.keys(newResult.breakdown || {}).length,
            },
          },
        };
      }

      throw new Error("Invalid type");
    } catch (error: any) {
      logger.error("Error in comparison", { error: error.message });
      throw new ComparisonError(error.message);
    }
  }
}

export const advancedAnalysisService = new AdvancedAnalysisService();
