import { translateToRussian } from "../../ai-services/translate";
import { analyzeArticlePotential } from "../../ai-services/analyze-article-potential";
import { apiKeysService } from "../api-keys/api-keys.service";
import { newsService } from "../news/news.service";
import { logger } from "../../lib/logger";
import {
  AnthropicApiKeyNotFoundError,
  TranslationFailedError,
  AnalysisFailedError,
  BatchAnalysisFailedError,
  ArticleUpdateFailedError,
} from "./news-analysis.errors";
import type {
  TranslateArticleBodyDto,
  AnalyzeArticleBodyDto,
  AnalyzeBatchBodyDto,
  BatchArticleItemDto,
} from "./news-analysis.dto";

export const newsAnalysisService = {
  /**
   * Переводит текст статьи с английского на русский
   * Опционально сохраняет перевод в БД если передан articleId
   */
  async translateArticle(dto: TranslateArticleBodyDto, userId: string) {
    try {
      // Получаем Anthropic API ключ пользователя
      const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
      if (!apiKey) {
        throw new AnthropicApiKeyNotFoundError();
      }

      logger.info(
        `[Translate] Translating text (${dto.text.length} chars) for user ${userId}`,
        {
          articleId: dto.articleId || "not provided",
        }
      );
      const startTime = Date.now();

      // Выполняем перевод
      const translated = await translateToRussian(apiKey.decryptedKey, dto.text);

      const duration = Date.now() - startTime;
      logger.info(`[Translate] Translation completed in ${duration}ms`);

      // Сохраняем перевод в БД если есть articleId
      if (dto.articleId) {
        try {
          const translationData = {
            text: translated,
            language: "ru",
            timestamp: new Date().toISOString(),
          };

          await newsService.updateArticleTranslation(
            dto.articleId,
            userId,
            translationData
          );

          logger.info(
            `[Translate] ✅ Translation saved to database for article ${dto.articleId}`
          );
        } catch (saveError: any) {
          logger.error(
            `[Translate] ⚠️ Failed to save translation to database:`,
            {
              articleId: dto.articleId,
              error: saveError.message,
            }
          );
          throw new ArticleUpdateFailedError(dto.articleId, "translation");
        }
      }

      return {
        original: dto.text,
        translated,
        language: "ru",
      };
    } catch (error: any) {
      if (
        error instanceof AnthropicApiKeyNotFoundError ||
        error instanceof ArticleUpdateFailedError
      ) {
        throw error;
      }
      logger.error("Error translating text:", {
        error: error.message,
        stack: error.stack,
      });
      throw new TranslationFailedError(error.message);
    }
  },

  /**
   * Анализирует потенциал статьи стать видео-скриптом
   * Опционально сохраняет анализ в БД если передан articleId
   */
  async analyzeArticle(dto: AnalyzeArticleBodyDto, userId: string) {
    try {
      logger.info(`[Article Potential] Request received`, {
        hasArticleId: !!dto.articleId,
        articleId: dto.articleId || "not provided",
        titleLength: dto.title?.length || 0,
        contentLength: dto.content?.length || 0,
      });

      const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
      if (!apiKey) {
        throw new AnthropicApiKeyNotFoundError();
      }

      logger.info(
        `[Article Potential] Analyzing article: ${dto.title.substring(0, 50)}...`,
        {
          articleId: dto.articleId || "unknown",
          userId,
        }
      );
      const startTime = Date.now();

      const analysis = await analyzeArticlePotential(
        apiKey.decryptedKey,
        dto.title,
        dto.content
      );

      const duration = Date.now() - startTime;

      if (dto.articleId) {
        try {
          logger.info(
            `[Article Potential] Attempting to save analysis to database for article ${dto.articleId}`
          );
          const updated = await newsService.updateArticleAnalysis(
            dto.articleId,
            userId,
            analysis
          );
          if (updated) {
            logger.info(
              `[Article Potential] ✅ Analysis saved to database for article ${dto.articleId}`,
              {
                hasArticleAnalysis: !!(updated as any).articleAnalysis,
                articleAnalysisType: typeof (updated as any).articleAnalysis,
              }
            );
          } else {
            logger.warn(
              `[Article Potential] ⚠️ update returned undefined for article ${dto.articleId}`
            );
          }
        } catch (saveError: any) {
          logger.error(
            `[Article Potential] ❌ Failed to save analysis to database:`,
            {
              articleId: dto.articleId,
              error: saveError.message,
              stack: saveError.stack,
            }
          );
        }
      } else {
        logger.warn(
          `[Article Potential] ⚠️ No articleId provided, analysis not saved to database`
        );
      }

      logger.info(`[Article Potential] Analysis completed in ${duration}ms`, {
        score: analysis.score,
        verdict: analysis.verdict,
        recommendedFormat: analysis.breakdown.recommendedFormat.format,
        articleId: dto.articleId || "unknown",
        saved: !!dto.articleId,
      });

      return {
        ...analysis,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      if (error instanceof AnthropicApiKeyNotFoundError) {
        throw error;
      }
      logger.error("Error analyzing article potential:", {
        error: error.message,
        stack: error.stack,
      });
      throw new AnalysisFailedError(error.message);
    }
  },

  /**
   * Анализирует несколько статей в пакетном режиме
   * Выполняет анализ параллельно с ограничением на количество одновременных запросов
   */
  async analyzeBatch(dto: AnalyzeBatchBodyDto, userId: string) {
    try {
      const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
      if (!apiKey) {
        throw new AnthropicApiKeyNotFoundError();
      }

      logger.info(
        `[News Analysis Batch] Analyzing ${dto.articles.length} articles`
      );
      const startTime = Date.now();

      // Анализируем статьи параллельно (по 5 одновременно чтобы не превысить rate limits)
      const BATCH_SIZE = 5;
      const results: Array<{
        articleId: string;
        analysis: any;
        error?: string;
      }> = [];

      for (let i = 0; i < dto.articles.length; i += BATCH_SIZE) {
        const batch = dto.articles.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (article: BatchArticleItemDto) => {
          try {
            const analysis = await analyzeArticlePotential(
              apiKey.decryptedKey,
              article.title || "",
              article.content || ""
            );

            if (article.id) {
              try {
                await newsService.updateArticleAnalysis(
                  article.id,
                  userId,
                  analysis
                );
                logger.debug(
                  `[News Analysis Batch] Saved analysis for article ${article.id}`
                );
              } catch (saveError: any) {
                logger.error(
                  `[News Analysis Batch] Failed to save analysis for article ${article.id}:`,
                  saveError
                );
              }
            }

            return {
              articleId: article.id,
              analysis,
            };
          } catch (error: any) {
            logger.error(
              `[News Analysis Batch] Error analyzing article ${article.id}:`,
              error
            );
            return {
              articleId: article.id,
              analysis: null,
              error: error.message || "Analysis failed",
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Небольшая задержка между батчами чтобы не превысить rate limits
        if (i + BATCH_SIZE < dto.articles.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[News Analysis Batch] Completed ${results.length} analyses in ${duration}ms`
      );

      return {
        results,
        metadata: {
          totalArticles: dto.articles.length,
          successful: results.filter((r) => !r.error).length,
          failed: results.filter((r) => r.error).length,
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      if (error instanceof AnthropicApiKeyNotFoundError) {
        throw error;
      }
      logger.error("Error in batch analysis:", {
        error: error.message,
        stack: error.stack,
      });
      throw new BatchAnalysisFailedError(error.message);
    }
  },
};
