import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { newsAnalysisService } from "./news-analysis.service";
import {
  AnthropicApiKeyNotFoundError,
  TranslationFailedError,
  AnalysisFailedError,
  BatchAnalysisFailedError,
  ArticleUpdateFailedError,
} from "./news-analysis.errors";
import {
  TranslateArticleBodyDto,
  AnalyzeArticleBodyDto,
  AnalyzeBatchBodyDto,
} from "./news-analysis.dto";

export const newsAnalysisController = {
  /**
   * POST /api/news/translate
   * Переводит текст статьи с английского на русский
   */
  async translateArticle(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = TranslateArticleBodyDto.parse(req.body);
      const result = await newsAnalysisService.translateArticle(
        validated,
        userId
      );

      res.json(result);
    } catch (error: any) {
      logger.error("Error in translateArticle controller", {
        userId,
        errorType: error.constructor?.name,
        message: error.message,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(400).json({
          message:
            "Anthropic API key not configured. Please add it in Settings.",
        });
      }

      if (error instanceof ArticleUpdateFailedError) {
        // Возвращаем успех, но с предупреждением
        return res.status(207).json({
          message: "Translation completed but failed to save to database",
          warning: error.message,
        });
      }

      if (error instanceof TranslationFailedError) {
        return res.status(500).json({
          message: error.message || "Failed to translate text",
        });
      }

      // Ошибки валидации Zod
      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Failed to translate text",
      });
    }
  },

  /**
   * POST /api/news/analyze
   * Анализирует потенциал статьи стать видео-скриптом
   */
  async analyzeArticle(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = AnalyzeArticleBodyDto.parse(req.body);
      const result = await newsAnalysisService.analyzeArticle(validated, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in analyzeArticle controller", {
        userId,
        errorType: error.constructor?.name,
        message: error.message,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(400).json({
          message:
            "Anthropic API key not configured. Please add it in Settings.",
        });
      }

      if (error instanceof AnalysisFailedError) {
        return res.status(500).json({
          message: error.message || "Failed to analyze article potential",
        });
      }

      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Failed to analyze article potential",
      });
    }
  },

  /**
   * POST /api/news/analyze-batch
   * Анализирует несколько статей в пакетном режиме
   */
  async analyzeBatch(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = AnalyzeBatchBodyDto.parse(req.body);
      const result = await newsAnalysisService.analyzeBatch(validated, userId);

      res.json(result);
    } catch (error: any) {
      logger.error("Error in analyzeBatch controller", {
        userId,
        errorType: error.constructor?.name,
        message: error.message,
      });

      if (error instanceof AnthropicApiKeyNotFoundError) {
        return res.status(400).json({
          message:
            "Anthropic API key not configured. Please add it in Settings.",
        });
      }

      if (error instanceof BatchAnalysisFailedError) {
        return res.status(500).json({
          message: error.message || "Failed to analyze articles",
        });
      }

      if (error.name === "ZodError") {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Failed to analyze articles",
      });
    }
  },
};
