import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { advancedAnalysisService } from "./advanced-analysis.service";
import {
  AnalyzeAdvancedNewsDto,
  AnalyzeAdvancedReelDto,
  AnalyzeAdvancedScriptDto,
  CompareAnalysisDto,
} from "./advanced-analysis.dto";
import {
  AnthropicApiKeyNotFoundError,
  AdvancedAnalysisError,
  ComparisonError,
} from "./advanced-analysis.errors";

/**
 * Advanced Analysis Controller
 * Работа с req/res, валидация входных данных
 */
export const advancedAnalysisController = {
  /**
   * POST /api/analyze/advanced/news
   * Продвинутый анализ новостей
   */
  async analyzeNews(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = AnalyzeAdvancedNewsDto.parse(req.body);
      const result = await advancedAnalysisService.analyzeNews(userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in advanced news analysis", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AdvancedAnalysisError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to analyze news content" });
    }
  },

  /**
   * POST /api/analyze/advanced/reel
   * Продвинутый анализ Instagram Reel
   */
  async analyzeReel(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = AnalyzeAdvancedReelDto.parse(req.body);
      const result = await advancedAnalysisService.analyzeReel(userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in advanced reel analysis", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AdvancedAnalysisError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to analyze reel content" });
    }
  },

  /**
   * POST /api/analyze/advanced/script
   * Продвинутый анализ скрипта
   */
  async analyzeScript(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = AnalyzeAdvancedScriptDto.parse(req.body);
      const result = await advancedAnalysisService.analyzeScript(userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in advanced script analysis", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof AdvancedAnalysisError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to analyze script" });
    }
  },

  /**
   * POST /api/analyze/compare
   * Сравнение старой и новой систем анализа
   */
  async compareAnalysis(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = CompareAnalysisDto.parse(req.body);
      const result = await advancedAnalysisService.compareAnalysis(userId, validated);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      logger.error("Error in comparison", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof ComparisonError) {
        return apiResponse.serverError(res, error.message, error);
      }

      return apiResponse.serverError(res, "Failed to compare analysis systems", error);
    }
  },
};
