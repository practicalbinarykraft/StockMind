import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { aiService } from "./ai.service";
import { AnalyzeScriptDto, ScoreTextDto } from "./ai.dto";
import {
  AnthropicApiKeyNotFoundError,
  InvalidAnthropicApiKeyError,
  AiAnalysisError,
} from "./ai.errors";

/**
 * AI Controller
 * Работа с req/res, валидация входных данных
 */
export const aiController = {
  /**
   * POST /api/ai/analyze-script
   * Анализ скрипта с помощью AI
   */
  async analyzeScript(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = AnalyzeScriptDto.parse(req.body);
      const analysis = await aiService.analyzeScript(userId, validated);

      res.json(analysis);
    } catch (error: any) {
      logger.error("Error analyzing script", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof InvalidAnthropicApiKeyError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof AiAnalysisError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to analyze script" });
    }
  },

  /**
   * POST /api/ai/score-text
   * Оценка текста с помощью AI
   */
  async scoreText(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = ScoreTextDto.parse(req.body);
      const result = await aiService.scoreText(userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error scoring text", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof AiAnalysisError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to score text" });
    }
  },
};
