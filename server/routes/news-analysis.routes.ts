import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { analyzeArticlePotential } from "../ai-services/analyze-article-potential";
import { analyzeScriptAdvanced } from "../ai-services/advanced";
import { translateToRussian } from "../ai-services/translate";
import { logger } from "../lib/logger";
import { apiResponse } from "../lib/api-response";

/**
 * News Analysis routes
 * Handles translation and analysis of news articles
 */
export function registerNewsAnalysisRoutes(app: Express) {
  /**
   * POST /api/news/translate
   * Translates article text from English to Russian
   * Optionally saves translation to database if articleId is provided
   */
  app.post("/api/news/translate", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { text, articleId } = req.body;
      if (!text) {
        return apiResponse.badRequest(res, "Text is required");
      }

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return apiResponse.badRequest(res, "Anthropic API key not configured. Please add it in Settings.");
      }

      logger.info(`[Translate] Translating text (${text.length} chars) for user ${userId}`, {
        articleId: articleId || 'not provided',
      });
      const startTime = Date.now();

      const translated = await translateToRussian(apiKey.decryptedKey, text);

      const duration = Date.now() - startTime;
      logger.info(`[Translate] Translation completed in ${duration}ms`);

      // Save translation to database if articleId is provided
      if (articleId) {
        try {
          const translationData = {
            text: translated,
            language: 'ru',
            timestamp: new Date().toISOString(),
          };
          
          await storage.updateRssItem(articleId, {
            articleTranslation: translationData as any,
          });
          
          logger.info(`[Translate] ✅ Translation saved to database for article ${articleId}`);
        } catch (saveError: any) {
          logger.error(`[Translate] ⚠️ Failed to save translation to database:`, {
            articleId,
            error: saveError.message,
          });
          // Don't fail the request if save fails, just log it
        }
      }

      return apiResponse.ok(res, {
        original: text,
        translated,
        language: 'ru',
      });
    } catch (error: any) {
      logger.error("Error translating text:", {
        error: error.message,
        stack: error.stack,
      });
      return apiResponse.serverError(res, error.message || "Failed to translate text", error);
    }
  });

  /**
   * POST /api/news/analyze
   * Analyzes article's POTENTIAL to become a video script (Level 2)
   * 
   * This analyzes the ARTICLE itself, NOT a script!
   * Evaluates:
   * - Can we create a hook from this article?
   * - Is there enough material for 15-20 sec video?
   * - What emotional angle can we use?
   * - What visuals can we show?
   * - What format would work best?
   * 
   * DOES NOT analyze hook/CTA/structure (they don't exist yet!)
   * 
   * Saves analysis result to database for persistence across page refreshes.
   */
  app.post("/api/news/analyze", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { title, content, articleId } = req.body;
      if (!title || !content) {
        return apiResponse.badRequest(res, "Title and content are required");
      }
      
      logger.info(`[Article Potential] Request received`, {
        hasArticleId: !!articleId,
        articleId: articleId || 'not provided',
        titleLength: title?.length || 0,
        contentLength: content?.length || 0,
      });

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return apiResponse.badRequest(res, "Anthropic API key not configured. Please add it in Settings.");
      }

      logger.info(`[Article Potential] Analyzing article: ${title.substring(0, 50)}...`, {
        articleId: articleId || 'unknown',
        userId,
      });
      const startTime = Date.now();

      const analysis = await analyzeArticlePotential(apiKey.decryptedKey, title, content);

      const duration = Date.now() - startTime;
      
      // Save analysis to database if articleId is provided
      if (articleId) {
        try {
          logger.info(`[Article Potential] Attempting to save analysis to database for article ${articleId}`);
          const updated = await storage.updateRssItem(articleId, {
            articleAnalysis: analysis as any, // Store full analysis result
          });
          if (updated) {
            logger.info(`[Article Potential] ✅ Analysis saved to database for article ${articleId}`, {
              hasArticleAnalysis: !!(updated as any).articleAnalysis,
              articleAnalysisType: typeof (updated as any).articleAnalysis,
            });
          } else {
            logger.warn(`[Article Potential] ⚠️ updateRssItem returned undefined for article ${articleId}`);
          }
        } catch (saveError: any) {
          logger.error(`[Article Potential] ❌ Failed to save analysis to database:`, {
            articleId,
            error: saveError.message,
            stack: saveError.stack,
          });
          // Don't fail the request if save fails, just log it
        }
      } else {
        logger.warn(`[Article Potential] ⚠️ No articleId provided, analysis not saved to database`);
      }

      logger.info(`[Article Potential] Analysis completed in ${duration}ms`, {
        score: analysis.score,
        verdict: analysis.verdict,
        recommendedFormat: analysis.breakdown.recommendedFormat.format,
        articleId: articleId || 'unknown',
        saved: !!articleId,
      });

      return apiResponse.ok(res, {
        ...analysis,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error analyzing article potential:", {
        error: error.message,
        stack: error.stack,
      });
      return apiResponse.serverError(res, error.message || "Failed to analyze article potential", error);
    }
  });

  /**
   * POST /api/news/analyze-batch
   * Analyzes multiple news articles in batch
   */
  app.post("/api/news/analyze-batch", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { articles } = req.body;
      if (!Array.isArray(articles) || articles.length === 0) {
        return apiResponse.badRequest(res, "Articles array is required");
      }

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return apiResponse.badRequest(res, "Anthropic API key not configured. Please add it in Settings.");
      }

      logger.info(`[News Analysis Batch] Analyzing ${articles.length} articles`);
      const startTime = Date.now();

      // Analyze articles in parallel (limit to 5 concurrent to avoid rate limits)
      const BATCH_SIZE = 5;
      const results: Array<{ articleId: string; analysis: any; error?: string }> = [];

      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (article: any) => {
          try {
            const analysis = await analyzeArticlePotential(
              apiKey.decryptedKey,
              article.title || '',
              article.content || ''
            );
            
            // Save analysis to database
            if (article.id) {
              try {
                await storage.updateRssItem(article.id, {
                  articleAnalysis: analysis as any,
                });
                logger.debug(`[News Analysis Batch] Saved analysis for article ${article.id}`);
              } catch (saveError: any) {
                logger.error(`[News Analysis Batch] Failed to save analysis for article ${article.id}:`, saveError);
                // Don't fail the request if save fails
              }
            }
            
            return {
              articleId: article.id,
              analysis,
            };
          } catch (error: any) {
            logger.error(`[News Analysis Batch] Error analyzing article ${article.id}:`, error);
            return {
              articleId: article.id,
              analysis: null,
              error: error.message || "Analysis failed",
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < articles.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[News Analysis Batch] Completed ${results.length} analyses in ${duration}ms`);

      return apiResponse.ok(res, {
        results,
        metadata: {
          totalArticles: articles.length,
          successful: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length,
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error in batch analysis:", {
        error: error.message,
        stack: error.stack,
      });
      return apiResponse.serverError(res, error.message || "Failed to analyze articles", error);
    }
  });
}

