/**
 * Generation Pipeline
 * Оркестрирует генерацию сценариев через Scriptwriter и Editor агентов
 */
import { db } from '../../db';
import { rssItems, autoScripts, conveyorItems, rssSources, type AutoScript } from '@shared/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { scriptwriterAgent, editorAgent } from './agents';
import type { ScriptwriterOutput, EditorOutput, SceneComment } from './agents';
import { generationSSE } from './generation-sse';
import { apiKeysService } from '../api-keys/api-keys.service';
import { conveyorSettingsService } from '../conveyor-settings/conveyor-settings.service';
import { parseRssSource } from '../../lib/rss-background-tasks';

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
      for (let i = 0; i < newsIds.length; i++) {
        const newsId = newsIds[i];
        console.log(`[Pipeline] ===== Итерация ${i + 1}/${newsIds.length} =====`);
        
        // Пропустить невалидные ID
        if (!newsId || typeof newsId !== 'string') {
          console.warn(`[Pipeline] Пропущен невалидный newsId:`, newsId);
          continue;
        }

        // Проверка на остановку пользователем
        const isRunning = generationSSE.isRunning(userId);
        console.log(`[Pipeline] isRunning: ${isRunning}`);
        if (!isRunning) {
          console.log(`[Pipeline] Генерация остановлена пользователем`);
          break;
        }

        // Проверка дневного лимита перед каждой генерацией
        const conveyorSettings = await conveyorSettingsService.getSettings(userId);
        if (!conveyorSettings) {
          console.error(`[Pipeline] Не удалось получить настройки конвейера для userId: ${userId}`);
          break;
        }
        
        console.log(`[Pipeline] Проверка лимита: processed=${conveyorSettings.itemsProcessedToday}, limit=${conveyorSettings.dailyLimit}`);
        if (conveyorSettings.itemsProcessedToday >= conveyorSettings.dailyLimit) {
          console.log(`[Pipeline] Достигнут дневной лимит (${conveyorSettings.dailyLimit} сценариев)`);
          generationSSE.sendEvent(userId, {
            type: 'limit_reached',
            data: {
              message: `Достигнут дневной лимит (${conveyorSettings.dailyLimit} сценариев)`,
              processed: conveyorSettings.itemsProcessedToday,
              limit: conveyorSettings.dailyLimit,
            },
          });
          break;
        }

        try {
          console.log(`[Pipeline] Обработка новости ${newsId}`);
          await this.runSingle(userId, newsId, settings);
          console.log(`[Pipeline] Обработка новости ${newsId} завершена успешно`);
        } catch (error: any) {
          console.error(`[Pipeline] Ошибка генерации для newsId ${newsId}:`, error.message);
          
          // Если ошибка связана с дубликатом - сообщаем пользователю через SSE
          if (error.message && error.message.includes('уже создан')) {
            generationSSE.sendEvent(userId, {
              type: 'script_skipped',
              data: {
                newsId,
                reason: 'Сценарий для этой новости уже существует',
              },
            });
          } else {
            // Для других ошибок отправляем уведомление об ошибке
            generationSSE.sendEvent(userId, {
              type: 'script_error',
              data: {
                newsId,
                error: error.message,
              },
            });
          }
          
          // Продолжаем с остальными новостями
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
    // minScore в шкале 1-10 (Editor работает в этой шкале)
    // При передаче из routes конвертируется из minScoreThreshold (50-95 из 100) делением на 10
    const minScore = settings.minApprovalScore || 8; // По умолчанию 8/10 = 80/100

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
        // Конвертируем оценку в шкалу 0-100 для отправки на клиент
        const scoreFor100 = Math.round(reviewResult.overallScore * 10);
        generationSSE.editorCompleted(userId, scriptId, scoreFor100, reviewResult.verdict);

        // --- DECISION ---
        if (reviewResult.verdict === 'approved' || reviewResult.overallScore >= minScore) {
          // Конвертируем оценку в шкалу 0-100 для сохранения и отправки на клиент
          const finalScore = Math.round(reviewResult.overallScore * 10);
          
          // Успех!
          await this.completeScript(scriptId, finalScore, userId);
          generationSSE.scriptCompleted(userId, scriptId, finalScore);
          console.log(`[Pipeline] Сценарий одобрен с оценкой ${reviewResult.overallScore}/10 (${finalScore}/100)`);
          // Обновить статистику из БД
          await this.refreshUserStats(userId);
          return { success: true, scriptId, finalScore };
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

    // Проверяем, существует ли уже сценарий для этой новости
    const [existingScript] = await db
      .select()
      .from(autoScripts)
      .where(
        and(
          eq(autoScripts.userId, userId),
          eq(autoScripts.sourceItemId, news.id)
        )
      )
      .limit(1);

    if (existingScript) {
      console.log(`[Pipeline] Сценарий для новости ${news.id} уже существует: ${existingScript.id}`);
      throw new Error(`Сценарий для этой новости уже создан (ID: ${existingScript.id})`);
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
    // Конвертируем оценку из шкалы 1-10 в 0-100
    const finalScore = Math.round(result.overallScore * 10);
    
    // Сохраняем результат рецензии
    // gateDecision: 'PASS' | 'NEEDS_REVIEW' | 'FAIL' (uppercase as per schema)
    await db
      .update(autoScripts)
      .set({
        finalScore,
        gateDecision: result.verdict === 'approved' ? 'PASS' : 
                      result.verdict === 'rejected' ? 'FAIL' : 'NEEDS_REVIEW',
      })
      .where(eq(autoScripts.id, scriptId));

    console.log(`[Pipeline] Сохранена рецензия для scriptId: ${scriptId}, оценка: ${result.overallScore}/10 (${finalScore}/100)`);
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

    console.log(`[Pipeline] Сценарий ${scriptId} завершен с оценкой ${finalScore}/100, счетчик увеличен`);
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
      console.log(`[Pipeline] Сценарий ${scriptId} отправлен на рецензию человека, счетчик увеличен`);
    } else {
      console.log(`[Pipeline] Сценарий ${scriptId} отправлен на рецензию человека, счетчик НЕ увеличен (userId отсутствует)`);
    }
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
   * @param autoParseIfNeeded - автоматически парсить источники, если нет свежих новостей
   * @param minScoreThreshold - минимальный score для новостей (по умолчанию 70)
   */
  async getNewsForGeneration(
    userId: string, 
    limit: number = 10, 
    maxAgeDays?: number,
    autoParseIfNeeded: boolean = false,
    minScoreThreshold: number = 70
  ): Promise<any[]> {
    console.log(`[Pipeline] getNewsForGeneration: userId=${userId}, limit=${limit}, maxAgeDays=${maxAgeDays}, minScoreThreshold=${minScoreThreshold}, autoParseIfNeeded=${autoParseIfNeeded}`);
    
    // Получаем ID новостей, для которых уже созданы сценарии
    const existingScripts = await db
      .select({ sourceItemId: autoScripts.sourceItemId })
      .from(autoScripts)
      .where(eq(autoScripts.userId, userId));
    
    const existingNewsIds = new Set(existingScripts.map(s => s.sourceItemId));
    console.log(`[Pipeline] Уже создано сценариев для ${existingNewsIds.size} новостей`);

    // Дата отсечки для фильтрации по возрасту
    const cutoffDate = maxAgeDays && maxAgeDays > 0 
      ? new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
      : null;
    
    if (cutoffDate) {
      console.log(`[Pipeline] Фильтр по дате: новости новее ${cutoffDate.toISOString()}`);
    }

    // ПАГИНАЦИЯ: Запрашиваем новости порциями пока не наберем нужное количество
    const batchSize = 50;
    let offset = 0;
    let filtered: any[] = [];
    let totalFetched = 0;
    let totalFiltered = 0;

    while (filtered.length < limit) {
      console.log(`[Pipeline] Запрос порции ${offset / batchSize + 1}: offset=${offset}, limit=${batchSize}`);
      
      const batch = await db
        .select()
        .from(rssItems)
        .where(
          and(
            // Только новости этого пользователя (или общие, если userId null)
            or(
              eq(rssItems.userId, userId),
              sql`${rssItems.userId} IS NULL`
            ),
            // Выбранные вручную или с подходящим AI score
            or(
              eq(rssItems.userAction, 'selected'),
              // Include items with score >= minScoreThreshold that haven't been dismissed
              and(
                sql`${rssItems.aiScore} >= ${minScoreThreshold}`,
                or(
                  sql`${rssItems.userAction} IS NULL`,
                  sql`${rssItems.userAction} != 'dismissed'`
                )
              )
            )
          )
        )
        .orderBy(desc(rssItems.publishedAt))
        .limit(batchSize)
        .offset(offset);

      totalFetched += batch.length;
      console.log(`[Pipeline] Получено из БД: ${batch.length} новостей (всего запрошено: ${totalFetched})`);

      // Если больше новостей нет - выходим
      if (batch.length === 0) {
        console.log(`[Pipeline] Новости в БД закончились после ${totalFetched} записей`);
        break;
      }

      // Фильтруем: убираем дубликаты
      const batchWithoutScripts = batch.filter(news => !existingNewsIds.has(news.id));
      
      // Фильтруем: по возрасту
      const batchFiltered = cutoffDate
        ? batchWithoutScripts.filter(n => {
            const newsDate = n.publishedAt || n.parsedAt;
            if (!newsDate) return true; // Включаем новости без даты
            return new Date(newsDate) >= cutoffDate;
          })
        : batchWithoutScripts;

      totalFiltered += batchFiltered.length;
      console.log(`[Pipeline] Подходящих новостей в порции: ${batchFiltered.length} (отфильтровано: дубликатов ${batch.length - batchWithoutScripts.length}, по дате ${batchWithoutScripts.length - batchFiltered.length})`);

      // Добавляем подходящие новости
      filtered.push(...batchFiltered);

      // Если уже достаточно - обрезаем и выходим
      if (filtered.length >= limit) {
        filtered = filtered.slice(0, limit);
        console.log(`[Pipeline] Набрано достаточно новостей: ${filtered.length}`);
        break;
      }

      // Переходим к следующей порции
      offset += batchSize;
    }

    console.log(`[Pipeline] Итого запрошено из БД: ${totalFetched} новостей, подходящих после фильтров: ${totalFiltered}`);

    // Если не нашли достаточно новостей и включён автопарсинг - парсим источники
    if (filtered.length < limit && autoParseIfNeeded) {
      console.log(`[Pipeline] Найдено только ${filtered.length} из ${limit} новостей, запускаем автоматический парсинг источников`);
      await this.parseAllUserSources(userId);
      
      // Подождём немного, чтобы парсинг успел создать записи
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Повторяем поиск после парсинга
      console.log(`[Pipeline] Повторный поиск новостей после парсинга...`);
      
      // Обновляем список существующих сценариев
      const updatedExistingScripts = await db
        .select({ sourceItemId: autoScripts.sourceItemId })
        .from(autoScripts)
        .where(eq(autoScripts.userId, userId));
      
      const updatedExistingNewsIds = new Set(updatedExistingScripts.map(s => s.sourceItemId));

      // Продолжаем пагинацию с того места где остановились
      while (filtered.length < limit) {
        console.log(`[Pipeline] Запрос порции ${offset / batchSize + 1} после парсинга: offset=${offset}, limit=${batchSize}`);
        
        const batch = await db
          .select()
          .from(rssItems)
          .where(
            and(
              or(
                eq(rssItems.userId, userId),
                sql`${rssItems.userId} IS NULL`
              ),
              or(
                eq(rssItems.userAction, 'selected'),
                and(
                  sql`${rssItems.aiScore} >= ${minScoreThreshold}`,
                  or(
                    sql`${rssItems.userAction} IS NULL`,
                    sql`${rssItems.userAction} != 'dismissed'`
                  )
                )
              )
            )
          )
          .orderBy(desc(rssItems.publishedAt))
          .limit(batchSize)
          .offset(offset);

        totalFetched += batch.length;

        if (batch.length === 0) {
          console.log(`[Pipeline] После парсинга новых новостей не найдено (всего запрошено: ${totalFetched})`);
          break;
        }

        const batchWithoutScripts = batch.filter(news => !updatedExistingNewsIds.has(news.id));
        const batchFiltered = cutoffDate
          ? batchWithoutScripts.filter(n => {
              const newsDate = n.publishedAt || n.parsedAt;
              if (!newsDate) return true;
              return new Date(newsDate) >= cutoffDate;
            })
          : batchWithoutScripts;

        totalFiltered += batchFiltered.length;
        filtered.push(...batchFiltered);

        if (filtered.length >= limit) {
          filtered = filtered.slice(0, limit);
          break;
        }

        offset += batchSize;
      }
      
      console.log(`[Pipeline] После автопарсинга найдено еще новостей: ${filtered.length} (всего запрошено: ${totalFetched})`);
    }

    console.log(`[Pipeline] ========================================`);
    console.log(`[Pipeline] ИТОГО возвращается новостей: ${filtered.length} из запрошенных ${limit}`);
    if (filtered.length < limit) {
      console.log(`[Pipeline] ⚠️  Новостей меньше запрошенного! Причины:`);
      console.log(`[Pipeline]    - Минимальный score: ${minScoreThreshold}`);
      console.log(`[Pipeline]    - Максимальный возраст: ${maxAgeDays || 'не ограничен'} дней`);
      console.log(`[Pipeline]    - Уже обработано: ${existingNewsIds.size} новостей`);
    }
    console.log(`[Pipeline] ========================================`);
    
    return filtered;
  }

  /**
   * Парсить все активные источники пользователя
   */
  async parseAllUserSources(userId: string): Promise<void> {
    try {
      console.log(`[Pipeline] Запуск парсинга всех источников для userId: ${userId}`);
      
      const sources = await db
        .select()
        .from(rssSources)
        .where(
          and(
            eq(rssSources.userId, userId),
            eq(rssSources.isActive, true)
          )
        );
      
      console.log(`[Pipeline] Найдено активных источников: ${sources.length}`);
      
      if (sources.length === 0) {
        console.log(`[Pipeline] У пользователя нет активных RSS источников`);
        return;
      }

      // Отправляем уведомление через SSE
      generationSSE.sendEvent(userId, {
        type: 'parsing_started',
        data: {
          message: `Запущен парсинг ${sources.length} источников`,
          sourcesCount: sources.length,
        },
      });

      // Запускаем парсинг всех источников параллельно
      const parsePromises = sources.map(source => 
        parseRssSource(source.id, source.url, userId)
          .catch(err => {
            console.error(`[Pipeline] Ошибка парсинга источника ${source.id}:`, err);
          })
      );

      await Promise.allSettled(parsePromises);
      
      console.log(`[Pipeline] Парсинг всех источников завершён`);

      // Отправляем уведомление о завершении
      generationSSE.sendEvent(userId, {
        type: 'parsing_completed',
        data: {
          message: `Парсинг ${sources.length} источников завершён`,
          sourcesCount: sources.length,
        },
      });
    } catch (error: any) {
      console.error(`[Pipeline] Ошибка при парсинге источников:`, error);
      generationSSE.sendEvent(userId, {
        type: 'parsing_error',
        data: {
          message: `Ошибка парсинга источников: ${error.message}`,
        },
      });
    }
  }
}

export const generationPipeline = new GenerationPipeline();
