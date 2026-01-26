/**
 * Generation Pipeline
 * Оркестрирует генерацию сценариев через Scriptwriter и Editor агентов
 */
import { db } from '../../db';
import { rssItems, autoScripts, conveyorItems, type AutoScript } from '@shared/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { scriptwriterAgent, editorAgent } from './agents';
import type { ScriptwriterOutput, EditorOutput, SceneComment } from './agents';
import { generationSSE } from './generation-sse';
import { apiKeysService } from '../api-keys/api-keys.service';
import { conveyorSettingsService } from '../conveyor-settings/conveyor-settings.service';

interface StylePreferences {
  formality: 'formal' | 'conversational' | 'casual';
  tone: 'serious' | 'engaging' | 'funny' | 'motivational';
  language: 'ru' | 'en';
}

interface DurationRange {
  min: number;
  max: number;
}

interface PipelineSettings {
  maxIterations: number;
  minApprovalScore: number;
  scriptwriterPrompt?: string;
  editorPrompt?: string;
  examples?: Array<{ content: string }>;
  // Новые настройки стиля
  stylePreferences?: StylePreferences;
  durationRange?: DurationRange;
}

interface GenerationResult {
  success: boolean;
  scriptId?: string;
  finalScore?: number;
  error?: string;
}

// Tracking active generations
const activeGenerations = new Map<string, { userId: string; abortController: AbortController }>();

class GenerationPipeline {
  /**
   * Запустить генерацию для списка новостей
   */
  async runBatch(
    userId: string,
    newsIds: string[],
    settings: PipelineSettings
  ): Promise<void> {
    console.log(`[Pipeline] Запуск batch генерации для ${newsIds.length} новостей`);

    // Получить API ключ
    const apiKey = await this.getApiKey(userId);
    if (!apiKey) {
      throw new Error('API ключ Anthropic не настроен');
    }

    // Установить ключи агентам
    scriptwriterAgent.setApiKey(apiKey);
    editorAgent.setApiKey(apiKey);

    // Установить состояние "запущен"
    generationSSE.setRunning(userId, true);

    // Обновить статистику при старте
    await this.refreshUserStats(userId);

    try {
      for (const newsId of newsIds) {
        // Пропустить невалидные ID
        if (!newsId || typeof newsId !== 'string') {
          console.warn(`[Pipeline] Пропущен невалидный newsId:`, newsId);
          continue;
        }

        // Проверка на остановку
        if (!generationSSE.isRunning(userId)) {
          console.log(`[Pipeline] Генерация остановлена пользователем`);
          break;
        }

        try {
          console.log(`[Pipeline] Обработка новости ${newsId}`);
          await this.runSingle(userId, newsId, settings);
        } catch (error: any) {
          console.error(`[Pipeline] Ошибка генерации для newsId ${newsId}:`, error);
          console.error(`[Pipeline] Error stack:`, error.stack);
          // Продолжаем с остальными
        }
      }
    } finally {
      generationSSE.setRunning(userId, false);
      // Финальное обновление статистики
      await this.refreshUserStats(userId);
      console.log(`[Pipeline] Batch генерация завершена`);
    }
  }

  /**
   * Запустить генерацию для одной новости
   */
  async runSingle(
    userId: string,
    newsId: string,
    settings: PipelineSettings
  ): Promise<GenerationResult> {
    console.log(`[Pipeline] Генерация для newsId: ${newsId}, userId: ${userId}`);

    try {
      // 1. Получить новость
      console.log(`[Pipeline] Получение новости с ID: ${newsId}`);
      const news = await this.getNews(newsId);
      
      if (!news) {
        console.error(`[Pipeline] Новость с ID ${newsId} не найдена в БД`);
        throw new Error(`Новость с ID ${newsId} не найдена`);
      }
      
      console.log(`[Pipeline] Новость найдена: ${news.title}`);

      // 2. Создать запись auto_script
      console.log(`[Pipeline] Создание auto_script для новости ${newsId}`);
      const autoScript = await this.createAutoScript(userId, news);
      
      if (!autoScript || !autoScript.id) {
        console.error(`[Pipeline] autoScript не создан или не имеет ID`);
        throw new Error('Failed to create autoScript');
      }
      
      const scriptId = autoScript.id;
      console.log(`[Pipeline] AutoScript создан с ID: ${scriptId}`);

      // Track this generation
      const abortController = new AbortController();
      activeGenerations.set(scriptId, { userId, abortController });

      try {
        // 3. Запустить цикл итераций
        const result = await this.runIterations(userId, scriptId, news, settings);
        return result;
      } finally {
        activeGenerations.delete(scriptId);
      }
    } catch (error: any) {
      console.error(`[Pipeline] Ошибка в runSingle:`, error);
      console.error(`[Pipeline] Stack trace:`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Цикл итераций генерации
   */
  private async runIterations(
    userId: string,
    scriptId: string,
    news: any,
    settings: PipelineSettings
  ): Promise<GenerationResult> {
    let currentIteration = 0;
    let previousReview: EditorOutput | null = null;

    const maxIterations = settings.maxIterations || 3;
    const minScore = settings.minApprovalScore || 8;

    while (currentIteration < maxIterations) {
      // Check if stopped
      if (!generationSSE.isRunning(userId)) {
        await this.markForHumanReview(scriptId, userId);
        return { success: false, scriptId, error: 'Остановлено пользователем' };
      }

      currentIteration++;
      console.log(`[Pipeline] Итерация ${currentIteration}/${maxIterations} для scriptId: ${scriptId}`);

      try {
        // --- SCRIPTWRITER ---
        generationSSE.scriptwriterStarted(userId, scriptId, currentIteration);

        const scriptResult = await scriptwriterAgent.process({
          newsTitle: news.title,
          newsContent: news.content || news.fullContent || '',
          previousReview: previousReview ? {
            overallComment: previousReview.overallComment,
            sceneComments: previousReview.sceneComments,
          } : undefined,
          version: currentIteration,
          customPrompt: settings.scriptwriterPrompt,
          examples: settings.examples,
          // Новые настройки стиля
          stylePreferences: settings.stylePreferences,
          durationRange: settings.durationRange,
          onThinking: (content) => {
            generationSSE.scriptwriterThinking(scriptId, content);
          },
        });

        await this.saveScriptVersion(scriptId, scriptResult, currentIteration);
        generationSSE.scriptwriterCompleted(userId, scriptId, scriptResult.scenes.length);

        // --- EDITOR ---
        generationSSE.editorStarted(userId, scriptId, currentIteration);

        const reviewResult = await editorAgent.process({
          script: scriptResult,
          newsTitle: news.title,
          newsContent: news.content || news.fullContent || '',
          customPrompt: settings.editorPrompt,
          minApprovalScore: minScore,
          onThinking: (content) => {
            generationSSE.editorThinking(scriptId, content);
          },
        });

        await this.saveReview(scriptId, reviewResult, currentIteration);
        generationSSE.editorCompleted(userId, scriptId, reviewResult.overallScore, reviewResult.verdict);

        // --- DECISION ---
        if (reviewResult.verdict === 'approved' || reviewResult.overallScore >= minScore) {
          // Успех!
          await this.completeScript(scriptId, reviewResult.overallScore, userId);
          generationSSE.scriptCompleted(userId, scriptId, reviewResult.overallScore);
          console.log(`[Pipeline] Сценарий одобрен с оценкой ${reviewResult.overallScore}/10`);
          // Обновить статистику из БД
          await this.refreshUserStats(userId);
          return { success: true, scriptId, finalScore: reviewResult.overallScore };
        }

        if (reviewResult.verdict === 'rejected') {
          // Отклонен - отправляем на рецензию человека
          await this.markForHumanReview(scriptId, userId);
          console.log(`[Pipeline] Сценарий отклонен редактором`);
          // Обновить статистику из БД
          await this.refreshUserStats(userId);
          return { success: false, scriptId, error: 'Отклонён редактором' };
        }

        // Нужна доработка
        previousReview = reviewResult;
        await this.updateIteration(scriptId, currentIteration);
      } catch (error: any) {
        console.error(`[Pipeline] Ошибка в итерации ${currentIteration}:`, error);
        await this.markForHumanReview(scriptId, userId);
        generationSSE.scriptError(userId, scriptId, error.message);
        // Обновить статистику из БД
        await this.refreshUserStats(userId);
        return { success: false, scriptId, error: error.message };
      }
    }

    // Достигнут лимит итераций
    await this.markForHumanReview(scriptId, userId);
    console.log(`[Pipeline] Достигнут лимит итераций для scriptId: ${scriptId}`);
    // Обновить статистику из БД
    await this.refreshUserStats(userId);
    return { success: false, scriptId, error: 'Достигнут лимит итераций' };
  }

  /**
   * Остановить генерацию
   */
  stop(userId: string): void {
    generationSSE.setRunning(userId, false);
    console.log(`[Pipeline] Генерация остановлена для userId: ${userId}`);
  }

  /**
   * Проверить, запущена ли генерация
   */
  isRunning(userId: string): boolean {
    return generationSSE.isRunning(userId);
  }

  // === Helper methods ===

  private async getApiKey(userId: string): Promise<string | null> {
    try {
      const apiKey = await apiKeysService.getUserApiKey(userId, 'anthropic');
      return apiKey.decryptedKey;
    } catch (error) {
      return null;
    }
  }

  private async getNews(newsId: string): Promise<any | null> {
    const [news] = await db
      .select()
      .from(rssItems)
      .where(eq(rssItems.id, newsId))
      .limit(1);
    return news || null;
  }

  private async createAutoScript(userId: string, news: any): Promise<AutoScript> {
    console.log(`[Pipeline] createAutoScript called with newsId: ${news?.id}, userId: ${userId}`);
    
    if (!news || !news.id) {
      throw new Error('News object is invalid or missing id');
    }

    // Сначала создаём conveyor_item для связи
    const conveyorItemResult = await db
      .insert(conveyorItems)
      .values({
        userId,
        sourceType: 'rss',
        sourceItemId: news.id,
        status: 'processing',
        currentStage: 1,
      })
      .returning();

    const conveyorItem = conveyorItemResult[0];
    
    if (!conveyorItem) {
      throw new Error('Failed to create conveyor_item');
    }

    console.log(`[Pipeline] Создан conveyor_item: ${conveyorItem.id}`);

    // Теперь создаём auto_script с реальным conveyorItemId
    const scriptResult = await db
      .insert(autoScripts)
      .values({
        userId,
        conveyorItemId: conveyorItem.id,
        sourceType: 'rss',
        sourceItemId: news.id,
        title: news.title,
        scenes: [],
        fullScript: '',
        formatId: 'viral_short',
        formatName: 'Viral Short',
        status: 'pending',
        gateDecision: 'NEEDS_REVIEW',
        finalScore: 0,
      })
      .returning();

    const script = scriptResult[0];
    
    if (!script) {
      throw new Error('Failed to create auto_script');
    }

    console.log(`[Pipeline] Создан auto_script: ${script.id}`);
    return script;
  }

  private async saveScriptVersion(
    scriptId: string,
    result: ScriptwriterOutput,
    iteration: number
  ): Promise<void> {
    const scenes = result.scenes.map((s, i) => ({
      id: `scene-${scriptId}-${iteration}-${i}`,
      order: s.number,
      text: s.text,
      visual: s.visual,
      duration: s.duration,
      alternatives: [],
    }));

    const fullScript = result.scenes.map(s => s.text).join('\n\n');

    await db
      .update(autoScripts)
      .set({
        scenes: scenes as any,
        fullScript,
        revisionCount: iteration - 1,
      })
      .where(eq(autoScripts.id, scriptId));

    console.log(`[Pipeline] Сохранена версия ${iteration} для scriptId: ${scriptId}`);
  }

  private async saveReview(
    scriptId: string,
    result: EditorOutput,
    iteration: number
  ): Promise<void> {
    // Сохраняем результат рецензии
    // gateDecision: 'PASS' | 'NEEDS_REVIEW' | 'FAIL' (uppercase as per schema)
    await db
      .update(autoScripts)
      .set({
        finalScore: result.overallScore,
        gateDecision: result.verdict === 'approved' ? 'PASS' : 
                      result.verdict === 'rejected' ? 'FAIL' : 'NEEDS_REVIEW',
      })
      .where(eq(autoScripts.id, scriptId));

    console.log(`[Pipeline] Сохранена рецензия для scriptId: ${scriptId}, оценка: ${result.overallScore}/10`);
  }

  private async completeScript(scriptId: string, finalScore: number, userId: string): Promise<void> {
    await db
      .update(autoScripts)
      .set({
        status: 'pending', // Готов к рецензии человека
        gateDecision: 'PASS', // uppercase as per schema
        finalScore,
      })
      .where(eq(autoScripts.id, scriptId));

    // Обновить счётчики в настройках конвейера
    await conveyorSettingsService.incrementDailyCount(userId);
    await conveyorSettingsService.incrementPassed(userId);
    // Примерная стоимость за сценарий (можно рассчитать точнее на основе токенов)
    await conveyorSettingsService.addCost(userId, 0.05);

    console.log(`[Pipeline] Сценарий ${scriptId} завершен с оценкой ${finalScore}/10`);
  }

  private async markForHumanReview(scriptId: string, userId?: string): Promise<void> {
    await db
      .update(autoScripts)
      .set({
        status: 'pending',
        gateDecision: 'NEEDS_REVIEW', // uppercase as per schema
      })
      .where(eq(autoScripts.id, scriptId));

    // Обновить счётчики если userId передан
    if (userId) {
      await conveyorSettingsService.incrementDailyCount(userId);
      await conveyorSettingsService.incrementFailed(userId);
      await conveyorSettingsService.addCost(userId, 0.05);
    }

    console.log(`[Pipeline] Сценарий ${scriptId} отправлен на рецензию человека`);
  }

  private async updateIteration(scriptId: string, iteration: number): Promise<void> {
    await db
      .update(autoScripts)
      .set({
        revisionCount: iteration,
      })
      .where(eq(autoScripts.id, scriptId));
  }

  /**
   * Обновить статус связанного conveyor_item
   */
  private async updateConveyorItemStatus(scriptId: string, status: 'completed' | 'failed'): Promise<void> {
    // Найти conveyorItemId по scriptId
    const [script] = await db
      .select({ conveyorItemId: autoScripts.conveyorItemId })
      .from(autoScripts)
      .where(eq(autoScripts.id, scriptId));

    if (script?.conveyorItemId) {
      await db
        .update(conveyorItems)
        .set({
          status,
          completedAt: new Date(),
        })
        .where(eq(conveyorItems.id, script.conveyorItemId));
    }
  }

  /**
   * Обновить статистику пользователя из БД и отправить через SSE
   */
  async refreshUserStats(userId: string): Promise<void> {
    const stats = await this.getStats(userId);
    generationSSE.refreshStatsFromDB(userId, stats);
  }

  // === Statistics ===

  async getStats(userId: string): Promise<{ parsed: number; analyzed: number; scriptsWritten: number; inReview: number }> {
    // Получить статистику из БД
    const [newsStats] = await db
      .select({
        total: sql<number>`count(*)`,
        analyzed: sql<number>`count(*) filter (where ${rssItems.aiScore} is not null)`,
      })
      .from(rssItems);

    const [scriptStats] = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${autoScripts.status} = 'pending')`,
      })
      .from(autoScripts)
      .where(eq(autoScripts.userId, userId));

    return {
      parsed: Number(newsStats?.total || 0),
      analyzed: Number(newsStats?.analyzed || 0),
      scriptsWritten: Number(scriptStats?.total || 0),
      inReview: Number(scriptStats?.pending || 0),
    };
  }

  /**
   * Получить новости для генерации (scored или selected)
   * @param userId - ID пользователя
   * @param limit - максимальное количество новостей
   * @param maxAgeDays - максимальный возраст новости в днях (опционально)
   */
  async getNewsForGeneration(userId: string, limit: number = 10, maxAgeDays?: number): Promise<any[]> {
    console.log(`[Pipeline] getNewsForGeneration: userId=${userId}, limit=${limit}, maxAgeDays=${maxAgeDays}`);
    
    const allNews = await db
      .select()
      .from(rssItems)
      .where(
        and(
          // Только новости этого пользователя (или общие, если userId null)
          or(
            eq(rssItems.userId, userId),
            sql`${rssItems.userId} IS NULL`
          ),
          // Выбранные вручную или с высоким AI score
          or(
            eq(rssItems.userAction, 'selected'),
            // Include items with high AI score that haven't been dismissed
            and(
              sql`${rssItems.aiScore} >= 70`,
              or(
                sql`${rssItems.userAction} IS NULL`,
                sql`${rssItems.userAction} != 'dismissed'`
              )
            )
          )
        )
      )
      .orderBy(desc(rssItems.publishedAt))
      .limit(limit);

    console.log(`[Pipeline] Найдено новостей из БД: ${allNews.length}`);
    
    // Фильтрация по возрасту
    if (maxAgeDays && maxAgeDays > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      
      const filtered = allNews.filter(n => {
        const newsDate = n.publishedAt || n.parsedAt;
        if (!newsDate) return true; // Включаем новости без даты
        return new Date(newsDate) >= cutoffDate;
      });
      
      console.log(`[Pipeline] После фильтрации по возрасту (${maxAgeDays} дней): ${filtered.length} новостей`);
      return filtered;
    }

    return allNews;
  }
}

export const generationPipeline = new GenerationPipeline();
