import { Router, Request, Response } from 'express';
import { db } from '../db';
import { scripts, iterations, scriptVersions, reviews } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { transformScriptResponse, transformIterationForFrontend } from '../lib/transformers';
import { getAllMockScripts, getMockScript, getMockScriptsByStatus } from '../data/mock-scripts';

const router = Router();

// GET /api/scripts/mock - получить все мок скрипты (для демонстрации)
router.get('/mock', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    if (status && typeof status === 'string') {
      const filtered = getMockScriptsByStatus(status as any);
      return res.json({
        items: filtered,
        total: filtered.length,
      });
    }
    
    const allMockScripts = getAllMockScripts();
    res.json({
      items: allMockScripts,
      total: allMockScripts.length,
    });
  } catch (error) {
    console.error('[Scripts] Ошибка при получении мок скриптов:', error);
    res.status(500).json({
      error: 'Ошибка при получении мок скриптов',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/scripts/mock/:id - получить один мок скрипт
router.get('/mock/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mockScript = getMockScript(id);
    
    if (!mockScript) {
      return res.status(404).json({
        error: 'Мок скрипт не найден',
        code: 'NOT_FOUND',
      });
    }
    
    res.json(mockScript);
  } catch (error) {
    console.error('[Scripts] Ошибка при получении мок скрипта:', error);
    res.status(500).json({
      error: 'Ошибка при получении мок скрипта',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/scripts - список сценариев с фильтрацией и пагинацией
router.get('/', async (req: Request, res: Response) => {
  try {
    // По умолчанию используем мок данные для демонстрации
    // Чтобы использовать реальные данные из БД, установите USE_REAL_DATA=true
    const useRealData = req.query.mock === 'false' || process.env.USE_REAL_DATA === 'true';
    
    if (!useRealData) {
      // Возвращаем мок данные
      const { status } = req.query;
      if (status && typeof status === 'string') {
        const filtered = getMockScriptsByStatus(status as any);
        return res.json({
          items: filtered,
          total: filtered.length,
        });
      }
      const allMockScripts = getAllMockScripts();
      return res.json({
        items: allMockScripts,
        total: allMockScripts.length,
      });
    }

    const { status, limit = '50', offset = '0' } = req.query;
    
    // Проверяем доступность БД
    if (!db) {
      // БД недоступна - возвращаем мок данные
      const { status: statusFilter } = req.query;
      if (statusFilter && typeof statusFilter === 'string') {
        const filtered = getMockScriptsByStatus(statusFilter as any);
        return res.json({
          items: filtered,
          total: filtered.length,
        });
      }
      const allMockScripts = getAllMockScripts();
      return res.json({
        items: allMockScripts,
        total: allMockScripts.length,
      });
    }
    
    // Проверяем, есть ли данные в БД
    let scriptsCount = [];
    try {
      scriptsCount = await db.select().from(scripts).limit(1);
    } catch (dbError) {
      // Если ошибка БД - возвращаем мок данные
      console.warn('[Scripts] Ошибка подключения к БД, возвращаем мок данные:', dbError);
      const { status: statusFilter } = req.query;
      if (statusFilter && typeof statusFilter === 'string') {
        const filtered = getMockScriptsByStatus(statusFilter as any);
        return res.json({
          items: filtered,
          total: filtered.length,
        });
      }
      const allMockScripts = getAllMockScripts();
      return res.json({
        items: allMockScripts,
        total: allMockScripts.length,
      });
    }
    
    // Если БД пустая - возвращаем мок данные
    if (scriptsCount.length === 0) {
      const { status: statusFilter } = req.query;
      if (statusFilter && typeof statusFilter === 'string') {
        const filtered = getMockScriptsByStatus(statusFilter as any);
        return res.json({
          items: filtered,
          total: filtered.length,
        });
      }
      const allMockScripts = getAllMockScripts();
      return res.json({
        items: allMockScripts,
        total: allMockScripts.length,
      });
    }

    // Строим условия фильтрации
    const conditions = [];
    if (status && typeof status === 'string') {
      conditions.push(eq(scripts.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    if (!db) {
      // БД недоступна - возвращаем мок данные
      const { status: statusFilter } = req.query;
      if (statusFilter && typeof statusFilter === 'string') {
        const filtered = getMockScriptsByStatus(statusFilter as any);
        return res.json({
          items: filtered,
          total: filtered.length,
        });
      }
      const allMockScripts = getAllMockScripts();
      return res.json({
        items: allMockScripts,
        total: allMockScripts.length,
      });
    }

    // Получаем скрипты с пагинацией
    const scriptsList = await db
      .select()
      .from(scripts)
      .where(whereClause)
      .orderBy(desc(scripts.createdAt))
      .limit(parseInt(limit as string, 10))
      .offset(parseInt(offset as string, 10));

    // Получаем общее количество для пагинации
    const totalResult = whereClause
      ? await db.select().from(scripts).where(whereClause)
      : await db.select().from(scripts);
    const total = totalResult.length;

    // Для каждого скрипта получаем iterationsCount и lastScore
    const items = await Promise.all(
      scriptsList.map(async (script) => {
        // Получаем количество итераций
        const iterationsList = await db
          .select()
          .from(iterations)
          .where(eq(iterations.scriptId, script.id));

        const iterationsCount = iterationsList.length;

        // Получаем последнюю рецензию для получения lastScore
        let lastScore: number | null = null;
        if (iterationsList.length > 0) {
          // Находим последнюю итерацию
          const lastIteration = iterationsList.sort((a, b) => b.version - a.version)[0];

          // Получаем рецензию для последней итерации
          const [lastReview] = await db
            .select()
            .from(reviews)
            .where(eq(reviews.iterationId, lastIteration.id))
            .limit(1);

          if (lastReview) {
            lastScore = lastReview.overallScore;
          }
        }

        return {
          ...script,
          iterationsCount,
          lastScore,
        };
      })
    );

    res.json({
      items,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('[Scripts] Ошибка при получении списка сценариев:', error);
    res.status(500).json({
      error: 'Ошибка при получении списка сценариев',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/scripts/:id - один сценарий со всеми итерациями
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Если скрипт начинается с 'mock-' или 'conveyor-' - всегда возвращаем мок данные
    if (id.startsWith('mock-') || id.startsWith('conveyor-')) {
      const mockScript = getMockScript(id);
      if (mockScript) {
        return res.json(mockScript);
      }
      return res.status(404).json({
        error: 'Мок скрипт не найден',
        code: 'NOT_FOUND',
      });
    }
    
    // Если БД недоступна - возвращаем мок данные
    if (!db) {
      const mockScript = getMockScript(id);
      if (mockScript) {
        return res.json(mockScript);
      }
      // Если не найден - возвращаем первый мок скрипт для демонстрации
      const allMockScripts = getAllMockScripts();
      if (allMockScripts.length > 0) {
        return res.json(allMockScripts[0]);
      }
      return res.status(404).json({
        error: 'Скрипт не найден',
        code: 'NOT_FOUND',
      });
    }
    
    // По умолчанию используем мок данные для демонстрации
    const useRealData = req.query.mock === 'false' || process.env.USE_REAL_DATA === 'true';
    
    if (!useRealData) {
      // Пытаемся найти мок скрипт по ID
      const mockScript = getMockScript(id);
      if (mockScript) {
        return res.json(mockScript);
      }
      // Если не найден - возвращаем первый мок скрипт для демонстрации
      const allMockScripts = getAllMockScripts();
      if (allMockScripts.length > 0) {
        return res.json(allMockScripts[0]);
      }
    }

    // 1. Получить скрипт
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.id, id))
      .limit(1);

    if (!script) {
      return res.status(404).json({
        error: 'Сценарий не найден',
        code: 'NOT_FOUND',
      });
    }

    // 2. Получить ВСЕ итерации с вложенными script_versions и reviews
    const iterationsList = await db
      .select()
      .from(iterations)
      .where(eq(iterations.scriptId, id))
      .orderBy(iterations.version);

    // Для каждой итерации получаем script_version и review
    const iterationsWithData = await Promise.all(
      iterationsList.map(async (iteration, index) => {
        // Получить script_version
        const [scriptVersion] = await db
          .select()
          .from(scriptVersions)
          .where(eq(scriptVersions.iterationId, iteration.id))
          .limit(1);

        // Получить review
        const [review] = await db
          .select()
          .from(reviews)
          .where(eq(reviews.iterationId, iteration.id))
          .limit(1);

        // Получить предыдущую версию для вычисления changes
        let previousScriptVersion = null;
        if (index > 0) {
          const prevIteration = iterationsList[index - 1];
          const [prevVersion] = await db
            .select()
            .from(scriptVersions)
            .where(eq(scriptVersions.iterationId, prevIteration.id))
            .limit(1);
          previousScriptVersion = prevVersion || null;
        }

        return {
          iteration,
          scriptVersion: scriptVersion || null,
          review: review || null,
          previousScriptVersion,
        };
      })
    );

    // 3. Использовать трансформер для формирования ответа
    const result = transformScriptResponse(script, iterationsWithData);

    res.json(result);
  } catch (error) {
    console.error('[Scripts] Ошибка при получении сценария:', error);
    res.status(500).json({
      error: 'Ошибка при получении сценария',
      code: 'INTERNAL_ERROR',
    });
  }
});

// PATCH /api/scripts/:id - обновить статус сценария
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Валидация статуса
    const validStatuses = ['approved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `status должен быть одним из: ${validStatuses.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    // 1. Проверить что status='human_review' или 'completed'
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.id, id))
      .limit(1);

    if (!script) {
      return res.status(404).json({
        error: 'Сценарий не найден',
        code: 'NOT_FOUND',
      });
    }

    if (script.status !== 'human_review' && script.status !== 'completed') {
      return res.status(400).json({
        error: `Невозможно изменить статус. Текущий статус: ${script.status}. Можно изменять только для статусов: human_review, completed`,
        code: 'INVALID_STATUS',
      });
    }

    // 2. Обновить статус
    const [updated] = await db
      .update(scripts)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(eq(scripts.id, id))
      .returning();

    // 3. Вернуть обновленный скрипт
    res.json(updated);
  } catch (error) {
    console.error('[Scripts] Ошибка при обновлении сценария:', error);
    res.status(500).json({
      error: 'Ошибка при обновлении сценария',
      code: 'INTERNAL_ERROR',
    });
  }
});

// DELETE /api/scripts/:id - удалить сценарий
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Проверяем существование сценария
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.id, id))
      .limit(1);

    if (!script) {
      return res.status(404).json({
        error: 'Сценарий не найден',
        code: 'NOT_FOUND',
      });
    }

    // 1. Удалить скрипт (каскадно удалятся iterations, versions, reviews)
    await db.delete(scripts).where(eq(scripts.id, id));

    console.log(`[Scripts] Сценарий ${id} удален`);

    // 2. Вернуть { success: true }
    res.json({ success: true });
  } catch (error) {
    console.error('[Scripts] Ошибка при удалении сценария:', error);
    res.status(500).json({
      error: 'Ошибка при удалении сценария',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/scripts/:id/iterations - только итерации
router.get('/:id/iterations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Проверяем существование сценария
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.id, id))
      .limit(1);

    if (!script) {
      return res.status(404).json({
        error: 'Сценарий не найден',
        code: 'NOT_FOUND',
      });
    }

    // Получить все итерации с данными
    const iterationsList = await db
      .select()
      .from(iterations)
      .where(eq(iterations.scriptId, id))
      .orderBy(iterations.version);

    // Для каждой итерации получаем script_version и review
    const iterationsWithData = await Promise.all(
      iterationsList.map(async (iteration, index) => {
        const [scriptVersion] = await db
          .select()
          .from(scriptVersions)
          .where(eq(scriptVersions.iterationId, iteration.id))
          .limit(1);

        const [review] = await db
          .select()
          .from(reviews)
          .where(eq(reviews.iterationId, iteration.id))
          .limit(1);

        // Получить предыдущую версию для вычисления changes
        let previousScriptVersion = null;
        if (index > 0) {
          const prevIteration = iterationsList[index - 1];
          const [prevVersion] = await db
            .select()
            .from(scriptVersions)
            .where(eq(scriptVersions.iterationId, prevIteration.id))
            .limit(1);
          previousScriptVersion = prevVersion || null;
        }

        return transformIterationForFrontend({
          ...iteration,
          scriptVersion: scriptVersion || null,
          review: review || null,
          previousScriptVersion,
        });
      })
    );

    // Вернуть только массив итераций
    res.json(iterationsWithData);
  } catch (error) {
    console.error('[Scripts] Ошибка при получении итераций:', error);
    res.status(500).json({
      error: 'Ошибка при получении итераций',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;
