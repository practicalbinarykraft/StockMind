/**
 * Generation Routes
 * API роуты для управления генерацией сценариев
 */
import { Router, Request, Response } from 'express';
import type { Express } from 'express';
import { requireAuth } from '../../middleware/jwt-auth';
import { generationPipeline } from './generation-pipeline';
import { generationSSE } from './generation-sse';
import { conveyorSettingsService } from '../conveyor-settings/conveyor-settings.service';

const router = Router();

/**
 * GET /api/generation/stats
 * Получить статистику конвейера
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      console.error('[Generation] req.userId не установлен');
      return res.status(401).json({
        error: 'Не авторизован',
        code: 'UNAUTHORIZED',
      });
    }
    
    const userId = req.userId;
    const stats = await generationPipeline.getStats(userId);
    const isRunning = generationPipeline.isRunning(userId);

    res.json({
      ...stats,
      isRunning,
    });
  } catch (error: any) {
    console.error('[Generation] Ошибка получения статистики:', error);
    res.status(500).json({
      error: 'Ошибка получения статистики',
      message: error.message,
    });
  }
});

/**
 * GET /api/generation/stream
 * SSE стрим для real-time обновлений
 */
router.get('/stream', requireAuth, (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      console.error('[Generation] req.userId не установлен');
      return res.status(401).json({
        error: 'Не авторизован',
        code: 'UNAUTHORIZED',
      });
    }
    
    const userId = req.userId;
    
    // Добавить клиента для получения обновлений
    generationSSE.addUserClient(userId, res);

    // Отправить текущую статистику сразу
    generationPipeline.getStats(userId).then(stats => {
      generationSSE.updateStats(userId, stats);
    });

    // НЕ вызываем res.end() - соединение остается открытым
  } catch (error: any) {
    console.error('[Generation] Ошибка подключения SSE:', error);
    res.status(500).json({
      error: 'Ошибка подключения к стриму',
      message: error.message,
    });
  }
});

/**
 * POST /api/generation/start
 * Запустить генерацию сценариев
 */
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      console.error('[Generation] req.userId не установлен');
      return res.status(401).json({
        error: 'Не авторизован',
        code: 'UNAUTHORIZED',
      });
    }
    
    const userId = req.userId;
    const { newsIds, limit = 5 } = req.body;

    // Проверить, не запущена ли уже генерация
    if (generationPipeline.isRunning(userId)) {
      return res.status(409).json({
        error: 'Генерация уже запущена',
        code: 'ALREADY_RUNNING',
      });
    }

    // Получить настройки конвейера (включает все настройки стиля, лимитов и т.д.)
    const conveyorSettings = await conveyorSettingsService.getSettings(userId);

    if (!conveyorSettings) {
      return res.status(500).json({
        error: 'Не удалось загрузить настройки конвейера',
        code: 'SETTINGS_NOT_FOUND',
      });
    }

    // Проверить дневной лимит
    if (conveyorSettings.itemsProcessedToday >= conveyorSettings.dailyLimit) {
      return res.status(429).json({
        error: `Достигнут дневной лимит (${conveyorSettings.dailyLimit} сценариев)`,
        code: 'DAILY_LIMIT_REACHED',
        limit: conveyorSettings.dailyLimit,
        processed: conveyorSettings.itemsProcessedToday,
      });
    }

    // Проверить месячный бюджет
    const currentCost = parseFloat(conveyorSettings.currentMonthCost) || 0;
    const budgetLimit = parseFloat(conveyorSettings.monthlyBudgetLimit) || 10;
    if (currentCost >= budgetLimit) {
      return res.status(429).json({
        error: `Достигнут лимит месячного бюджета ($${budgetLimit})`,
        code: 'BUDGET_LIMIT_REACHED',
        currentCost,
        budgetLimit,
      });
    }

    // Если newsIds не указаны - получить автоматически
    let targetNewsIds = newsIds;
    if (!targetNewsIds || targetNewsIds.length === 0) {
      // Учитываем maxAgeDays и оставшийся лимит на день
      const remainingLimit = Math.min(
        limit, 
        conveyorSettings.dailyLimit - conveyorSettings.itemsProcessedToday
      );
      
      console.log(`[Generation] Получение новостей для генерации, лимит: ${remainingLimit}, maxAgeDays: ${conveyorSettings.maxAgeDays}`);
      
      const news = await generationPipeline.getNewsForGeneration(
        userId, 
        remainingLimit,
        conveyorSettings.maxAgeDays,
        true // autoParseIfNeeded - автоматически парсить источники, если нет свежих новостей
      );
      
      console.log(`[Generation] Найдено новостей: ${news.length}`);
      
      // Фильтруем новости с валидными ID
      targetNewsIds = news.filter(n => n && n.id).map(n => n.id);
      
      console.log(`[Generation] Валидных ID новостей: ${targetNewsIds.length}`);
    }

    if (targetNewsIds.length === 0) {
      return res.status(400).json({
        error: 'Нет новостей для генерации. Проверьте настройки RSS источников.',
        code: 'NO_NEWS',
      });
    }
    
    console.log(`[Generation] Запуск batch генерации для ${targetNewsIds.length} новостей:`, targetNewsIds);

    // Извлечь настройки стиля
    const stylePreferences = (conveyorSettings.stylePreferences as {
      formality: 'formal' | 'conversational' | 'casual';
      tone: 'serious' | 'engaging' | 'funny' | 'motivational';
      language: 'ru' | 'en';
    } | null) || { formality: 'conversational' as const, tone: 'engaging' as const, language: 'ru' as const };

    const durationRange = (conveyorSettings.durationRange as {
      min: number;
      max: number;
    } | null) || { min: 30, max: 90 };

    const customPrompts = conveyorSettings.customPrompts as {
      writerPrompt?: string;
      editorPrompt?: string;
    } || {};

    const scriptExamples = conveyorSettings.scriptExamples as string[] || [];

    // Запустить генерацию в фоне
    generationPipeline.runBatch(userId, targetNewsIds, {
      maxIterations: 3,
      minApprovalScore: conveyorSettings.minScoreThreshold || 70,
      scriptwriterPrompt: customPrompts.writerPrompt,
      editorPrompt: customPrompts.editorPrompt,
      examples: scriptExamples.map(content => ({ content })),
      // Новые настройки стиля
      stylePreferences,
      durationRange,
    }).catch(error => {
      console.error('[Generation] Ошибка batch генерации:', error);
    });

    res.json({
      success: true,
      message: 'Генерация запущена',
      newsCount: targetNewsIds.length,
    });
  } catch (error: any) {
    console.error('[Generation] Ошибка запуска генерации:', error);
    res.status(500).json({
      error: 'Ошибка запуска генерации',
      message: error.message,
    });
  }
});

/**
 * POST /api/generation/stop
 * Остановить генерацию
 */
router.post('/stop', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      console.error('[Generation] req.userId не установлен');
      return res.status(401).json({
        error: 'Не авторизован',
        code: 'UNAUTHORIZED',
      });
    }
    
    const userId = req.userId;

    if (!generationPipeline.isRunning(userId)) {
      return res.status(400).json({
        error: 'Генерация не запущена',
        code: 'NOT_RUNNING',
      });
    }

    generationPipeline.stop(userId);

    res.json({
      success: true,
      message: 'Генерация остановлена',
    });
  } catch (error: any) {
    console.error('[Generation] Ошибка остановки генерации:', error);
    res.status(500).json({
      error: 'Ошибка остановки генерации',
      message: error.message,
    });
  }
});

/**
 * POST /api/generation/start-single
 * Запустить генерацию для одной новости
 */
router.post('/start-single', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      console.error('[Generation] req.userId не установлен');
      return res.status(401).json({
        error: 'Не авторизован',
        code: 'UNAUTHORIZED',
      });
    }
    
    const userId = req.userId;
    const { newsId } = req.body;

    if (!newsId) {
      return res.status(400).json({
        error: 'newsId обязателен',
        code: 'VALIDATION_ERROR',
      });
    }

    // Получить настройки конвейера
    const conveyorSettings = await conveyorSettingsService.getSettings(userId);

    if (!conveyorSettings) {
      return res.status(500).json({
        error: 'Не удалось загрузить настройки конвейера',
        code: 'SETTINGS_NOT_FOUND',
      });
    }

    // Извлечь настройки стиля
    const stylePreferences = (conveyorSettings.stylePreferences as {
      formality: 'formal' | 'conversational' | 'casual';
      tone: 'serious' | 'engaging' | 'funny' | 'motivational';
      language: 'ru' | 'en';
    } | null) || { formality: 'conversational' as const, tone: 'engaging' as const, language: 'ru' as const };

    const durationRange = (conveyorSettings.durationRange as {
      min: number;
      max: number;
    } | null) || { min: 30, max: 90 };

    const customPrompts = (conveyorSettings.customPrompts as {
      writerPrompt?: string;
      editorPrompt?: string;
    } | null) || {};

    const scriptExamples = (conveyorSettings.scriptExamples as string[] | null) || [];

    // Запустить генерацию в фоне
    generationPipeline.runSingle(userId, newsId, {
      maxIterations: 3,
      minApprovalScore: conveyorSettings.minScoreThreshold || 70,
      scriptwriterPrompt: customPrompts.writerPrompt,
      editorPrompt: customPrompts.editorPrompt,
      examples: scriptExamples.map(content => ({ content })),
      stylePreferences,
      durationRange,
    }).then(result => {
      console.log('[Generation] Single result:', result);
    }).catch(error => {
      console.error('[Generation] Ошибка single генерации:', error);
    });

    res.json({
      success: true,
      message: 'Генерация запущена для новости',
      newsId,
    });
  } catch (error: any) {
    console.error('[Generation] Ошибка запуска single генерации:', error);
    res.status(500).json({
      error: 'Ошибка запуска генерации',
      message: error.message,
    });
  }
});

/**
 * GET /api/generation/news
 * Получить новости для генерации
 */
router.get('/news', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      console.error('[Generation] req.userId не установлен');
      return res.status(401).json({
        error: 'Не авторизован',
        code: 'UNAUTHORIZED',
      });
    }
    
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    const news = await generationPipeline.getNewsForGeneration(userId, limit);

    res.json({
      items: news,
      total: news.length,
    });
  } catch (error: any) {
    console.error('[Generation] Ошибка получения новостей:', error);
    res.status(500).json({
      error: 'Ошибка получения новостей',
      message: error.message,
    });
  }
});

export function registerGenerationRoutes(app: Express) {
  app.use('/api/generation', router);
}

export default router;
