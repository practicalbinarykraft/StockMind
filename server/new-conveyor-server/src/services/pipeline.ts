import { db } from '../db';
import {
  newsItems,
  scripts,
  iterations,
  scriptVersions,
  reviews,
  aiSettings,
  Script,
  NewsItem,
  AISettings,
  Iteration,
  Review,
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { ScriptwriterAgent } from '../agents/scriptwriter';
import { EditorAgent } from '../agents/editor';
import { ScriptwriterOutput } from '../agents/scriptwriter';
import { EditorOutput } from '../agents/editor';
import { sseManager } from '../events/sse-manager';
import { LLMProvider } from '../lib/llm-provider';

/**
 * Pipeline для генерации сценариев
 * Оркестрирует работу Scriptwriter и Editor агентов
 */
class Pipeline {
  private scriptwriter = new ScriptwriterAgent();
  private editor = new EditorAgent();

  /**
   * Установить провайдера для агентов
   */
  private setProvider(provider: LLMProvider): void {
    this.scriptwriter.setProvider(provider);
    this.editor.setProvider(provider);
  }

  /**
   * Запуск генерации сценария для новости
   * @param newsId - ID новости
   * @param existingScriptId - Опциональный ID существующего script (для retry)
   */
  async run(newsId: string, existingScriptId?: string): Promise<void> {
    console.log(`[Pipeline] Запуск генерации для новости: ${newsId}`);

    try {
      // 1. Получить новость из БД
      const news = await this.getNews(newsId);
      if (!news) {
        throw new Error(`Новость с ID ${newsId} не найдена`);
      }

      // 2. Получить настройки AI
      const settings = await this.getSettings();

      // 3. Установить провайдера из настроек
      const provider = (settings.provider as LLMProvider) || 'anthropic';
      this.setProvider(provider);
      console.log(`[Pipeline] Используем провайдера: ${provider}`);

      // 4. Создать script запись или использовать существующую
      let script: Script;
      if (existingScriptId) {
        // Используем существующий script и обновляем статус
        const [existingScript] = await db
          .select()
          .from(scripts)
          .where(eq(scripts.id, existingScriptId))
          .limit(1);
        
        if (!existingScript) {
          throw new Error(`Script с ID ${existingScriptId} не найден`);
        }
        
        // Обновляем статус на in_progress
        const [updatedScript] = await db
          .update(scripts)
          .set({
            status: 'in_progress',
            updatedAt: new Date(),
          })
          .where(eq(scripts.id, existingScriptId))
          .returning();
        
        script = updatedScript;
      } else {
        // Создаем новый script
        script = await this.createScript(news);
      }

      // 5. Emit: started
      sseManager.emit(script.id, 'started', { scriptId: script.id });

      // 6. Запустить цикл итераций
      await this.runIterations(script, news, settings);
    } catch (error) {
      console.error(`[Pipeline] Ошибка при генерации для новости ${newsId}:`, error);
      // Найдем scriptId если он был создан
      const news = await this.getNews(newsId);
      if (news) {
        const existingScript = await db
          .select()
          .from(scripts)
          .where(eq(scripts.newsId, newsId))
          .orderBy(scripts.createdAt)
          .limit(1);

        if (existingScript.length > 0) {
          await this.handleError(existingScript[0].id, error as Error);
        }
      }
      throw error;
    }
  }

  /**
   * Цикл итераций генерации
   */
  private async runIterations(
    script: Script,
    news: NewsItem,
    settings: AISettings
  ): Promise<void> {
    let currentIteration = 0;
    let previousReview: Review | null = null;

    while (currentIteration < (settings.maxIterations || 3)) {
      currentIteration++;

      console.log(`[Pipeline] Итерация ${currentIteration}/${settings.maxIterations || 3} для scriptId: ${script.id}`);

      // Создать iteration
      const iteration = await this.createIteration(script.id, currentIteration);

      try {
        // --- SCRIPTWRITER ---
        sseManager.emit(script.id, 'scriptwriter:started', { iteration: currentIteration });

        const scriptResult = await this.scriptwriter.process({
          newsTitle: news.title,
          newsContent: news.content || news.fullContent || '',
          settings,
          previousReview: previousReview || undefined,
          version: currentIteration,
          onThinking: (content) => {
            sseManager.emit(script.id, 'scriptwriter:thinking', { content });
          },
        });

        await this.saveScriptVersion(iteration.id, scriptResult);
        sseManager.emit(script.id, 'scriptwriter:completed', { scenes: scriptResult.scenes });

        // --- EDITOR ---
        sseManager.emit(script.id, 'editor:started', { iteration: currentIteration });

        const reviewResult = await this.editor.process({
          script: scriptResult,
          newsTitle: news.title,
          newsContent: news.content || news.fullContent || '',
          settings,
          onThinking: (content) => {
            sseManager.emit(script.id, 'editor:thinking', { content });
          },
        });

        await this.saveReview(iteration.id, reviewResult);
        sseManager.emit(script.id, 'editor:completed', { review: reviewResult });

        // --- DECISION ---
        if (
          reviewResult.verdict === 'approved' ||
          reviewResult.overallScore >= (settings.minApprovalScore || 8)
        ) {
          // Успех!
          await this.completeScript(script.id, reviewResult.overallScore);
          sseManager.emit(script.id, 'completed', {
            scriptId: script.id,
            finalScore: reviewResult.overallScore,
          });
          console.log(`[Pipeline] Сценарий одобрен с оценкой ${reviewResult.overallScore}/10`);
          return;
        }

        if (reviewResult.verdict === 'rejected') {
          // Отклонен
          await this.rejectScript(script.id);
          sseManager.emit(script.id, 'rejected', { scriptId: script.id });
          console.log(`[Pipeline] Сценарий отклонен редактором`);
          return;
        }

        // Нужна доработка
        previousReview = reviewResult;
        sseManager.emit(script.id, 'needs_revision', {
          iteration: currentIteration,
          review: reviewResult,
        });

        // Обновить currentIteration в БД
        await this.updateScriptIteration(script.id, currentIteration);
      } catch (error) {
        console.error(`[Pipeline] Ошибка в итерации ${currentIteration}:`, error);
        await this.handleError(script.id, error as Error);
        throw error;
      }
    }

    // Достигнут лимит итераций
    await this.setHumanReview(script.id);
    sseManager.emit(script.id, 'max_iterations_reached', { scriptId: script.id });
    console.log(`[Pipeline] Достигнут лимит итераций для scriptId: ${script.id}`);
  }

  // Вспомогательные методы для работы с БД

  /**
   * Получить новость по ID
   */
  private async getNews(id: string): Promise<NewsItem | null> {
    const [news] = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1);
    return news || null;
  }

  /**
   * Получить настройки AI (или создать дефолтные)
   */
  private async getSettings(): Promise<AISettings> {
    const [settings] = await db.select().from(aiSettings).limit(1);

    if (settings) {
      return settings;
    }

    // Создаем дефолтные настройки если их нет
    const [newSettings] = await db
      .insert(aiSettings)
      .values({
        provider: 'anthropic',
        maxIterations: 3,
        minApprovalScore: 8,
        autoSendToHumanReview: true,
        examples: [],
      })
      .returning();

    return newSettings;
  }

  /**
   * Создать запись script в БД
   */
  private async createScript(news: NewsItem): Promise<Script> {
    const [script] = await db
      .insert(scripts)
      .values({
        newsId: news.id,
        newsTitle: news.title,
        newsSource: news.source || '',
        status: 'in_progress',
        currentIteration: 0,
        maxIterations: 3,
      })
      .returning();

    console.log(`[Pipeline] Создан script с ID: ${script.id}`);
    return script;
  }

  /**
   * Создать итерацию
   */
  private async createIteration(scriptId: string, version: number): Promise<Iteration> {
    const [iteration] = await db
      .insert(iterations)
      .values({
        scriptId,
        version,
      })
      .returning();

    console.log(`[Pipeline] Создана итерация ${version} с ID: ${iteration.id}`);
    return iteration;
  }

  /**
   * Сохранить версию сценария
   */
  private async saveScriptVersion(
    iterationId: string,
    result: ScriptwriterOutput
  ): Promise<void> {
    await db.insert(scriptVersions).values({
      iterationId,
      scenes: result.scenes as any, // JSONB
      fullText: result.scenes.map((s) => s.text).join('\n\n'),
      tokensUsed: null, // TODO: получить из ответа API
      cost: null, // TODO: рассчитать стоимость
    });

    console.log(`[Pipeline] Сохранена версия сценария для итерации: ${iterationId}`);
  }

  /**
   * Сохранить рецензию редактора
   */
  private async saveReview(iterationId: string, result: EditorOutput): Promise<void> {
    await db.insert(reviews).values({
      iterationId,
      overallScore: result.overallScore,
      overallComment: result.overallComment,
      sceneComments: result.sceneComments as any, // JSONB
      verdict: result.verdict,
      tokensUsed: null, // TODO: получить из ответа API
      cost: null, // TODO: рассчитать стоимость
    });

    console.log(`[Pipeline] Сохранена рецензия для итерации: ${iterationId}, оценка: ${result.overallScore}/10`);
  }

  /**
   * Завершить сценарий (одобрен)
   */
  private async completeScript(scriptId: string, finalScore: number): Promise<void> {
    await db
      .update(scripts)
      .set({
        status: 'completed',
        finalScore,
        updatedAt: new Date(),
      })
      .where(eq(scripts.id, scriptId));

    console.log(`[Pipeline] Сценарий ${scriptId} завершен с оценкой ${finalScore}/10`);
  }

  /**
   * Отклонить сценарий
   */
  private async rejectScript(scriptId: string): Promise<void> {
    await db
      .update(scripts)
      .set({
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where(eq(scripts.id, scriptId));

    console.log(`[Pipeline] Сценарий ${scriptId} отклонен`);
  }

  /**
   * Установить статус "требует рецензии человека"
   */
  private async setHumanReview(scriptId: string): Promise<void> {
    await db
      .update(scripts)
      .set({
        status: 'human_review',
        updatedAt: new Date(),
      })
      .where(eq(scripts.id, scriptId));

    console.log(`[Pipeline] Сценарий ${scriptId} отправлен на рецензию человека`);
  }

  /**
   * Обновить текущую итерацию в script
   */
  private async updateScriptIteration(scriptId: string, iteration: number): Promise<void> {
    await db
      .update(scripts)
      .set({
        currentIteration: iteration,
        updatedAt: new Date(),
      })
      .where(eq(scripts.id, scriptId));
  }

  /**
   * Обработка ошибок
   */
  private async handleError(scriptId: string, error: Error): Promise<void> {
    console.error(`[Pipeline] Обработка ошибки для scriptId ${scriptId}:`, error);

    // Обновляем статус script на ошибку (можно добавить поле error в схему)
    await db
      .update(scripts)
      .set({
        status: 'human_review', // Или можно создать статус 'error'
        updatedAt: new Date(),
      })
      .where(eq(scripts.id, scriptId));

    // Отправляем событие об ошибке
    sseManager.emit(scriptId, 'error', {
      message: error.message,
      scriptId,
    });

    // Закрываем SSE соединения
    sseManager.close(scriptId);
  }
}

// Экспортируем singleton экземпляр
export const pipeline = new Pipeline();
