import { NewsRepo } from "./news.repo";
import { rssSourcesService } from "../rss-sources/rss-sources.service";
import { 
  NewsItemNotFoundError, 
  ArticleContentFetchError,
  ArticleAnalysisNotFoundError,
  BatchScoringError,
  RefreshNewsError
} from "./news.errors";
import { 
  rssParser, 
  cleanRssContent, 
  normalizeRssUrl, 
  sortNewsByScoreAndDate,
  filterByScoreCategory,
  parseJsonbField
} from "./news.utils";
import { fetchAndExtract } from "../../lib/fetch-and-extract";
import { scoreRssItems } from "../../routes/helpers/background-tasks";
import { logger } from "../../lib/logger";
import type { RssItem } from "@shared/schema";

const newsRepo = new NewsRepo();

export const newsService = {
  /**
   * Получить все новости пользователя с enriched данными
   */
  async getNews(userId: string): Promise<any[]> {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const items = await newsRepo.getAllBySourceIds(sourceIds);

    // Создаем map для быстрого доступа к имени источника
    const sourceNameMap = new Map(sources.map(s => [s.id, s.name]));

    // Обогащаем данные: добавляем freshness label, нормализуем score, добавляем sourceName
    const enrichedItems = items.map(item => {
      let freshnessLabel = 'old';
      if (item.publishedAt) {
        const hoursAgo = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 1) freshnessLabel = 'hot';
        else if (hoursAgo < 6) freshnessLabel = 'trending';
        else if (hoursAgo < 24) freshnessLabel = 'recent';
      }
      const score = item.aiScore ?? item.freshnessScore ?? item.viralityScore ?? null;
      return { 
        ...item, 
        freshnessLabel, 
        score,
        sourceName: sourceNameMap.get(item.sourceId) || 'Unknown Source'
      }; // вытащить в utils
    });

    // Авто-scoring для items без AI score в фоне
    const itemsWithoutScore = items.filter(item => item.aiScore === null);
    if (itemsWithoutScore.length > 0) {
      logger.debug("Starting auto-scoring for items without AI score", { count: itemsWithoutScore.length });
      scoreRssItems(itemsWithoutScore, userId).catch(err =>
        logger.error("Auto-scoring failed", { error: err.message })
      );
    }

    // Сортируем через утилиту
    const sortedItems = sortNewsByScoreAndDate(enrichedItems);

    return sortedItems;
  },

  /**
   * Получить score для конкретной новости
   */
  async getNewsScore(id: string, userId: string) {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    
    // Парсим JSONB поля
    const items = rawItems.map(item => ({
      ...item,
      articleAnalysis: parseJsonbField((item as any).articleAnalysis),
      articleTranslation: parseJsonbField((item as any).articleTranslation),
    }));
    
    const item = items.find(i => i.id === id);

    if (!item) {
      throw new NewsItemNotFoundError();
    }

    const score = item.aiScore ?? item.freshnessScore ?? item.viralityScore ?? null;
    
    return {
      id: item.id,
      score,
      aiScore: item.aiScore,
      freshnessScore: item.freshnessScore,
      viralityScore: item.viralityScore,
      aiComment: item.aiComment,
    };
  },

  /**
   * Обновить action для новости (dismiss, select, seen)
   */
  async updateNewsAction(id: string, userId: string, action: string, projectId?: string) {
    // Проверяем, принадлежит ли новость пользователю
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    const item = rawItems.find(i => i.id === id);

    if (!item) {
      throw new NewsItemNotFoundError();
    }

    const updated = await newsRepo.updateAction(id, userId, action, projectId);
    return updated;
  },

  /**
   * Ручное обновление из RSS источников
   */
  async refreshNews(userId: string): Promise<{ success: boolean; newItems: number }> {
    try {
      const sources = await rssSourcesService.getRssSources(userId);
      let totalNew = 0;
      const newItems: RssItem[] = [];

      for (const source of sources.filter(s => s.isActive)) {
        try {
          const normalizedUrl = normalizeRssUrl(source.url);
          const feed = await rssParser.parseURL(normalizedUrl);
          const existingItems = await newsRepo.getBySourceId(source.id);
          const existingUrls = new Set(existingItems.map(item => item.url));

          for (const item of feed.items) {
            if (!existingUrls.has(item.link || '')) {
              const newItem = await newsRepo.create({
                sourceId: source.id,
                userId,
                title: item.title || 'Untitled',
                url: item.link || '',
                content: cleanRssContent(item.contentSnippet || item.content || ''),
                imageUrl: item.enclosure?.url || null,
                publishedAt: item.pubDate ? new Date(item.pubDate) : null,
              });
              totalNew++;
              newItems.push(newItem);
            }
          }

          // Обновляем статус источника через rss-sources.repo
          await rssSourcesService.updateRssSource(source.id, userId, {
            lastParsed: new Date(),
            parseStatus: 'success',
            itemCount: feed.items.length,
          });
        } catch (error: any) {
          logger.error(`Error parsing RSS ${source.name}:`, { error: error.message, url: source.url });
          await rssSourcesService.updateRssSource(source.id, userId, {
            parseStatus: 'error',
            parseError: error.message,
          });
        }
      }

      // Scoring первых 50 новых items в фоне
      if (newItems.length > 0) {
        const itemsToScore = newItems
          .filter(item => item.aiScore === null || item.aiScore === undefined)
          .sort((a, b) => {
            const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
            return bDate - aDate;
          })
          .slice(0, 50);

        if (itemsToScore.length > 0) {
          logger.info(`Starting background scoring for ${itemsToScore.length} new items`, { userId });
          scoreRssItems(itemsToScore, userId).catch(err =>
            logger.error("Background scoring failed", { error: err.message })
          );
        }
      }

      return { success: true, newItems: totalNew };
    } catch (error: any) {
      logger.error("Error refreshing news", { error: error.message });
      throw new RefreshNewsError(error.message);
    }
  },// to do упростить

  /**
   * Batch scoring - оценить несколько новостей по ID
   */
  async scoreBatch(itemIds: string[], userId: string) {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const allItems = await newsRepo.getAllBySourceIds(sourceIds);

    const itemsToScore = allItems.filter(item =>
      itemIds.includes(item.id) && item.aiScore === null
    );

    if (itemsToScore.length === 0) {
      return {
        success: true,
        message: "All requested items already have scores",
        scoredCount: 0
      };
    }

    logger.info(`Starting batch scoring for ${itemsToScore.length} items`, { userId });

    scoreRssItems(itemsToScore, userId).catch(err =>
      logger.error("Batch scoring failed", { error: err.message })
    );

    return {
      success: true,
      message: `Scoring ${itemsToScore.length} items in background`,
      scoredCount: itemsToScore.length
    };
  },

  /**
   * Получить сохраненный анализ статьи
   */
  async getAnalysis(id: string, userId: string) {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    
    // Парсим JSONB поля
    const items = rawItems.map(item => ({
      ...item,
      articleAnalysis: parseJsonbField((item as any).articleAnalysis),
      articleTranslation: parseJsonbField((item as any).articleTranslation),
    }));
    
    const item = items.find(i => i.id === id);

    if (!item) {
      logger.warn(`[News Analysis] Article ${id} not found for user ${userId}`);
      throw new NewsItemNotFoundError();
    }

    const analysis = (item as any).articleAnalysis;
    if (!analysis) {
      logger.info(`[News Analysis] No saved analysis found for article ${id}`);
      throw new ArticleAnalysisNotFoundError();
    }

    logger.info(`[News Analysis] ✅ Returning saved analysis for article ${id}`, {
      hasScore: !!analysis.score,
      verdict: analysis.verdict,
    });

    return { success: true, data: analysis };
  },

  /**
   * Получить полный контент статьи через web scraping
   */
  async fetchFullContent(id: string, userId: string) {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    const item = rawItems.find(i => i.id === id);

    if (!item) {
      throw new NewsItemNotFoundError();
    }

    // Проверяем кеш (6 часов)
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    if (item.fullContent && item.lastFetchedAt) {
      const age = Date.now() - new Date(item.lastFetchedAt).getTime();
      if (age < SIX_HOURS_MS && item.fullContent.length >= 500) {
        logger.debug("Using cached article content", { url: item.url, ageSeconds: Math.round(age / 1000) });
        return { success: true, content: item.fullContent, cached: true };
      }
    }

    // Извлекаем полный контент
    const result = await fetchAndExtract(item.url);
    if (!result.ok) {
      logger.warn("Failed to extract article", { url: item.url, reason: result.reason });
      throw new ArticleContentFetchError(result.reason || 'Unknown error');
    }

    // Сохраняем в БД
    await newsRepo.setFullContent(id, result.content || 'No content');
    logger.info("Successfully extracted and cached article content", { url: item.url });

    return { success: true, content: result.content || 'No content', cached: false };
  },

  /**
   * Extended refresh - расширенный парсинг
   */
  async refreshExtended(userId: string, startDate?: string, endDate?: string) {
    const sources = await rssSourcesService.getRssSources(userId);

    if (startDate && endDate) {
      logger.debug("Extended parse with date range", { 
        startDate, 
        endDate, 
        note: "RSS feeds typically only provide latest items" 
      });
    }

    let totalNew = 0;
    let totalProcessed = 0;

    for (const source of sources.filter(s => s.isActive)) {
      try {
        const normalizedUrl = normalizeRssUrl(source.url);
        const feed = await rssParser.parseURL(normalizedUrl);
        const existingItems = await newsRepo.getBySourceId(source.id);
        const existingUrls = new Set(existingItems.map(item => item.url));

        for (const item of feed.items) {
          totalProcessed++;
          if (!existingUrls.has(item.link || '')) {
            await newsRepo.create({
              sourceId: source.id,
              userId,
              title: item.title || 'Untitled',
              url: item.link || '',
              content: cleanRssContent(item.contentSnippet || item.content || ''),
              imageUrl: item.enclosure?.url || null,
              publishedAt: item.pubDate ? new Date(item.pubDate) : null,
            });
            totalNew++;
          }
        }

        await rssSourcesService.updateRssSource(source.id, userId, {
          lastParsed: new Date(),
          parseStatus: 'success',
          itemCount: feed.items.length,
        });
      } catch (error: any) {
        logger.error(`Error parsing RSS ${source.name} (extended):`, { error: error.message, url: source.url });
        await rssSourcesService.updateRssSource(source.id, userId, {
          parseStatus: 'error',
          parseError: error.message,
        });
      }
    } // to do упростить

    return { success: true, newItems: totalNew, totalProcessed };
  },

  /**
   * Получить все новости с фильтрами (News Hub)
   */
  async getAllNews(userId: string, filters: { source?: string; score?: string; sort?: string }) {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    
    // Парсим JSONB поля
    let items = rawItems.map(item => ({
      ...item,
      articleAnalysis: parseJsonbField((item as any).articleAnalysis),
      articleTranslation: parseJsonbField((item as any).articleTranslation),
    }));

    // Фильтр по источнику
    if (filters.source && filters.source !== "all") {
      items = items.filter(item => item.sourceId === filters.source);
    }

    // Фильтр по score
    if (filters.score && filters.score !== "all") {
      items = items.filter(item => {
        const itemScore = item.aiScore ?? 0;
        return filterByScoreCategory(itemScore, filters.score!);
      });
    }

    // Сортировка
    if (filters.sort === "score") {
      items.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));
    } else {
      items.sort((a, b) => {
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate;
      });
    }

    // Обогащаем данными источника
    const sourceMap = new Map(sources.map(s => [s.id, s.name]));
    const enrichedItems = items.map(item => ({
      ...item,
      sourceName: sourceMap.get(item.sourceId) || 'Unknown Source',
    }));

    const withAnalysis = enrichedItems.filter(i => (i as any).articleAnalysis).length;
    const withTranslation = enrichedItems.filter(i => (i as any).articleTranslation).length;

    logger.info(`[News All] Returning ${enrichedItems.length} articles`, {
      withAnalysis,
      withTranslation,
    });

    return enrichedItems;
  },

  /**
   * Добавить статью в избранное
   */
  async addToFavorite(id: string, userId: string, notes?: string) {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    const item = rawItems.find(i => i.id === id);

    if (!item) {
      throw new NewsItemNotFoundError();
    }

    await newsRepo.updateFavorite(id, true, new Date(), notes || null);
    return { success: true };
  },

  /**
   * Удалить статью из избранного
   */
  async removeFromFavorite(id: string, userId: string) {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    const item = rawItems.find(i => i.id === id);

    if (!item) {
      throw new NewsItemNotFoundError();
    }

    await newsRepo.updateFavorite(id, false, null);
    return { success: true };
  },

  /**
   * Получить все избранные статьи
   */
  async getFavorites(userId: string) {
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    
    // Парсим JSONB поля
    let items = rawItems.map(item => ({
      ...item,
      articleAnalysis: parseJsonbField((item as any).articleAnalysis),
      articleTranslation: parseJsonbField((item as any).articleTranslation),
    }));

    // Фильтруем только избранные
    items = items.filter(item => item.isFavorite === true);

    // Сортируем по дате добавления в избранное
    items.sort((a, b) => {
      const aDate = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0;
      const bDate = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0;
      return bDate - aDate;
    });

    // Обогащаем данными источника
    const sourceMap = new Map(sources.map(s => [s.id, s.name]));
    const enrichedItems = items.map(item => ({
      ...item,
      sourceName: sourceMap.get(item.sourceId) || 'Unknown Source'
    }));

    return enrichedItems;
  },

  /**
   * Обновить перевод статьи (используется модулем news-analysis)
   */
  async updateArticleTranslation(articleId: string, userId: string, translationData: any) {
    // Проверяем, принадлежит ли статья пользователю
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    const item = rawItems.find(i => i.id === articleId);

    if (!item) {
      throw new NewsItemNotFoundError();
    }

    // Обновляем перевод
    await newsRepo.update(articleId, {
      articleTranslation: translationData as any,
    });

    logger.info(`[News Service] Translation updated for article ${articleId}`);
  },

  /**
   * Обновить анализ статьи (используется модулем news-analysis)
   */
  async updateArticleAnalysis(articleId: string, userId: string, analysis: any) {
    // Проверяем, принадлежит ли статья пользователю
    const sources = await rssSourcesService.getRssSources(userId);
    const sourceIds = sources.map(s => s.id);
    const rawItems = await newsRepo.getAllBySourceIds(sourceIds);
    const item = rawItems.find(i => i.id === articleId);

    if (!item) {
      throw new NewsItemNotFoundError();
    }

    // Обновляем анализ
    const updated = await newsRepo.update(articleId, {
      articleAnalysis: analysis as any,
    });

    logger.info(`[News Service] Analysis updated for article ${articleId}`);
    return updated;
  },
};
