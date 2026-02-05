import { Router, Request, Response } from 'express';
import { db } from '../db';
import { newsItems, scripts } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { sseManager } from '../events/sse-manager';
import { pipeline } from '../services/pipeline';
import { getAllMockConveyorItems, getMockConveyorItem, getMockConveyorItemsByStatus } from '../data/mock-conveyor';
import { getAllMockScripts } from '../data/mock-scripts';

const router = Router();

// GET /api/conveyor/stats - получить статистику для конвейера
router.get('/conveyor/stats', async (req: Request, res: Response) => {
  try {
    const useMock = req.query.mock === 'true' || process.env.USE_MOCK_DATA === 'true';
    
    if (useMock) {
      const mockScripts = getAllMockScripts();
      const mockNews = [
        { id: '1', aiScore: 85 },
        { id: '2', aiScore: 78 },
        { id: '3', aiScore: 92 },
      ];
      
      return res.json({
        parsed: mockNews.length,
        analyzed: mockNews.filter(n => n.aiScore !== null).length,
        scriptsWritten: mockScripts.length,
        inReview: mockScripts.filter(s => s.status === 'human_review' || s.status === 'completed').length,
      });
    }
    
    // Реальная статистика из БД
    const allScripts = await db.select().from(scripts);
    const allNews = await db.select().from(newsItems);
    
    // Если БД пустая - возвращаем мок статистику
    if (allScripts.length === 0 && allNews.length === 0) {
      const mockScripts = getAllMockScripts();
      const mockNews = [
        { id: '1', aiScore: 85 },
        { id: '2', aiScore: 78 },
        { id: '3', aiScore: 92 },
      ];
      
      return res.json({
        parsed: mockNews.length,
        analyzed: mockNews.filter(n => n.aiScore !== null).length,
        scriptsWritten: mockScripts.length,
        inReview: mockScripts.filter(s => s.status === 'human_review' || s.status === 'completed').length,
      });
    }
    
    const inReviewScripts = allScripts.filter(s => s.status === 'human_review' || s.status === 'completed');
    const analyzedNews = allNews.filter(n => n.aiScore !== null);
    
    res.json({
      parsed: allNews.length,
      analyzed: analyzedNews.length,
      scriptsWritten: allScripts.length,
      inReview: inReviewScripts.length,
    });
  } catch (error) {
    console.error('[Generation] Ошибка при получении статистики:', error);
    res.status(500).json({
      error: 'Ошибка при получении статистики',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/conveyor/mock - получить мок данные конвейера (для демонстрации)
router.get('/conveyor/mock', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    if (status && typeof status === 'string') {
      const filtered = getMockConveyorItemsByStatus(status as any);
      return res.json({
        items: filtered,
        total: filtered.length,
      });
    }
    
    const allItems = getAllMockConveyorItems();
    res.json({
      items: allItems,
      total: allItems.length,
    });
  } catch (error) {
    console.error('[Generation] Ошибка при получении мок данных конвейера:', error);
    res.status(500).json({
      error: 'Ошибка при получении мок данных конвейера',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/conveyor/mock/:id - получить один мок элемент конвейера
router.get('/conveyor/mock/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = getMockConveyorItem(id);
    
    if (!item) {
      return res.status(404).json({
        error: 'Мок элемент конвейера не найден',
        code: 'NOT_FOUND',
      });
    }
    
    res.json(item);
  } catch (error) {
    console.error('[Generation] Ошибка при получении мок элемента конвейера:', error);
    res.status(500).json({
      error: 'Ошибка при получении мок элемента конвейера',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/generation/start - запустить генерацию для новости
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { newsId } = req.body;

    if (!newsId) {
      return res.status(400).json({
        error: 'newsId обязателен',
        code: 'VALIDATION_ERROR',
      });
    }

    // 1. Проверить что новость существует и status='selected' или 'scored'
    const [news] = await db
      .select()
      .from(newsItems)
      .where(
        and(
          eq(newsItems.id, newsId),
          or(eq(newsItems.status, 'selected'), eq(newsItems.status, 'scored'))
        )
      )
      .limit(1);

    if (!news) {
      return res.status(404).json({
        error: 'Новость не найдена или не готова к генерации (статус должен быть selected или scored)',
        code: 'NOT_FOUND',
      });
    }

    // 2. Проверить что нет активной генерации для этой новости
    const [existingScript] = await db
      .select()
      .from(scripts)
      .where(
        and(
          eq(scripts.newsId, newsId),
          eq(scripts.status, 'in_progress')
        )
      )
      .limit(1);

    if (existingScript) {
      return res.status(409).json({
        error: 'Генерация уже запущена для этой новости',
        code: 'ALREADY_RUNNING',
        scriptId: existingScript.id,
      });
    }

    // 3. Обновить статус новости на 'used'
    await db
      .update(newsItems)
      .set({
        status: 'used',
        updatedAt: new Date(),
      })
      .where(eq(newsItems.id, newsId));

    // 3. Обновить статус новости на 'used'
    await db
      .update(newsItems)
      .set({
        status: 'used',
        updatedAt: new Date(),
      })
      .where(eq(newsItems.id, newsId));

    // 4. Создать script запись заранее чтобы получить scriptId для ответа
    const [script] = await db
      .insert(scripts)
      .values({
        newsId: news.id,
        newsTitle: news.title,
        newsSource: news.source || '',
        status: 'pending', // Pipeline изменит на in_progress
        currentIteration: 0,
        maxIterations: 3,
      })
      .returning();

    // 5. Запустить pipeline.run(newsId, scriptId) в background (не await!)
    pipeline.run(newsId, script.id).catch((error) => {
      console.error(`[Generation Routes] Ошибка в pipeline для newsId ${newsId}:`, error);
      // Ошибка уже обработана в pipeline.handleError()
    });

    // 6. Вернуть scriptId
    res.json({
      scriptId: script.id,
      message: 'Generation started',
    });
  } catch (error) {
    console.error('[Generation Routes] Ошибка при запуске генерации:', error);
    res.status(500).json({
      error: 'Ошибка при запуске генерации',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/generation/stream/:scriptId - SSE стрим прогресса генерации
router.get('/stream/:scriptId', async (req: Request, res: Response) => {
  const { scriptId } = req.params;

  if (!scriptId) {
    return res.status(400).json({
      error: 'scriptId обязателен',
      code: 'VALIDATION_ERROR',
    });
  }

  try {
    // 1. Проверить что script существует
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.id, scriptId))
      .limit(1);

    if (!script) {
      return res.status(404).json({
        error: 'Сценарий не найден',
        code: 'NOT_FOUND',
      });
    }

    // 2. Вызвать sseManager.addClient(scriptId, res)
    sseManager.addClient(scriptId, res);

    // 3. Если script уже completed/rejected - отправить финальное событие
    if (script.status === 'completed') {
      sseManager.emit(scriptId, 'completed', {
        scriptId,
        finalScore: script.finalScore,
        message: 'Сценарий уже завершен',
      });
      // Не закрываем соединение - клиент может остаться подключенным
    } else if (script.status === 'rejected') {
      sseManager.emit(scriptId, 'rejected', {
        scriptId,
        message: 'Сценарий был отклонен',
      });
    } else if (script.status === 'human_review') {
      sseManager.emit(scriptId, 'human_review', {
        scriptId,
        message: 'Сценарий отправлен на рецензию человека',
      });
    }

    // НЕ вызываем res.end() - соединение остается открытым
    // Клиент будет автоматически удален при закрытии соединения
  } catch (error) {
    console.error('[Generation Routes] Ошибка при подключении SSE клиента:', error);
    res.status(500).json({
      error: 'Ошибка при подключении к стриму',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/generation/stop/:scriptId - остановить генерацию
router.post('/stop/:scriptId', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;

    // 1. Найти script
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.id, scriptId))
      .limit(1);

    if (!script) {
      return res.status(404).json({
        error: 'Сценарий не найден',
        code: 'NOT_FOUND',
      });
    }

    // 2. Если status='in_progress' - поменять на 'human_review'
    if (script.status === 'in_progress') {
      await db
        .update(scripts)
        .set({
          status: 'human_review',
          updatedAt: new Date(),
        })
        .where(eq(scripts.id, scriptId));

      console.log(`[Generation Routes] Генерация остановлена для scriptId: ${scriptId}`);
    }

    // 3. sseManager.close(scriptId)
    sseManager.emit(scriptId, 'stopped', {
      scriptId,
      message: 'Генерация остановлена пользователем',
    });
    sseManager.close(scriptId);

    // 4. Вернуть { success: true }
    res.json({ success: true });
  } catch (error) {
    console.error('[Generation Routes] Ошибка при остановке генерации:', error);
    res.status(500).json({
      error: 'Ошибка при остановке генерации',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/generation/retry/:scriptId - перезапустить генерацию
router.post('/retry/:scriptId', async (req: Request, res: Response) => {
  try {
    const { scriptId } = req.params;

    // 1. Найти script
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.id, scriptId))
      .limit(1);

    if (!script) {
      return res.status(404).json({
        error: 'Сценарий не найден',
        code: 'NOT_FOUND',
      });
    }

    // 2. Если status='human_review' или 'rejected'
    if (script.status !== 'human_review' && script.status !== 'rejected') {
      return res.status(400).json({
        error: `Невозможно перезапустить генерацию. Текущий статус: ${script.status}`,
        code: 'INVALID_STATUS',
      });
    }

    // 3. Сбросить currentIteration на последнюю (или оставить как есть)
    // currentIteration уже содержит последнюю итерацию

    // 4. Поменять status на 'in_progress'
    await db
      .update(scripts)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(scripts.id, scriptId));

    // 5. Запустить pipeline.run() с newsId и scriptId
    if (!script.newsId) {
      return res.status(400).json({
        error: 'У сценария отсутствует newsId',
        code: 'INVALID_DATA',
      });
    }

    // Запускаем pipeline асинхронно с существующим scriptId
    pipeline.run(script.newsId, scriptId).catch((error) => {
      console.error(`[Generation Routes] Ошибка в pipeline при retry для scriptId ${scriptId}:`, error);
    });

    console.log(`[Generation Routes] Перезапуск генерации для scriptId: ${scriptId}`);

    // 6. Вернуть { success: true }
    res.json({ success: true, message: 'Генерация перезапущена' });
  } catch (error) {
    console.error('[Generation Routes] Ошибка при перезапуске генерации:', error);
    res.status(500).json({
      error: 'Ошибка при перезапуске генерации',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
