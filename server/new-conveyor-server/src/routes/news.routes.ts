import { Router, Request, Response } from 'express';
import { db } from '../db';
import { newsItems } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { parseAllSources } from '../services/rss-parser';
import { scoreNewsItem } from '../services/news-scorer';

const router = Router();

// GET /api/news - список новостей с фильтрацией и пагинацией
router.get('/', async (req: Request, res: Response) => {
  try {
    // По умолчанию используем мок данные для демонстрации
    // Чтобы использовать реальные данные из БД, установите USE_REAL_DATA=true
    const useRealData = req.query.mock === 'false' || process.env.USE_REAL_DATA === 'true';
    
    if (!useRealData) {
      const mockNews = [
        {
          id: 'mock-news-1',
          title: 'Искусственный интеллект научился создавать реалистичные видео',
          content: 'Новая модель от OpenAI может генерировать видео по текстовому описанию. Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд.',
          fullContent: 'Новая модель от OpenAI может генерировать видео по текстовому описанию. Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд. Это открывает новые возможности для создания контента.',
          source: 'TechNews',
          sourceUrl: 'https://example.com/news/1',
          url: 'https://example.com/news/1',
          imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
          publishedAt: new Date('2024-01-15T09:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 85,
          aiComment: 'Актуальная тема с высоким потенциалом вирусности',
          createdAt: new Date('2024-01-15T09:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T09:30:00Z').toISOString(),
        },
        {
          id: 'mock-news-2',
          title: 'Учёные создали материал, который может самовосстанавливаться',
          content: 'Материал из MIT может автоматически восстанавливаться при повреждении. Это открывает новые возможности для создания долговечных конструкций.',
          fullContent: 'Материал из MIT может автоматически восстанавливаться при повреждении. Это открывает новые возможности для создания долговечных конструкций. Технология может быть использована в различных отраслях.',
          source: 'ScienceDaily',
          sourceUrl: 'https://example.com/news/2',
          url: 'https://example.com/news/2',
          imageUrl: 'https://images.unsplash.com/photo-1532619675605-1ede6c4ed2b0?w=800',
          publishedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 78,
          aiComment: 'Интересная научная новость с практическим применением',
          createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
        },
        {
          id: 'mock-news-3',
          title: 'Новый алгоритм ИИ может предсказывать землетрясения за неделю',
          content: 'Система анализирует данные сейсмографов и предсказывает землетрясения с высокой точностью. Это может спасти тысячи жизней.',
          fullContent: 'Система анализирует данные сейсмографов и предсказывает землетрясения с высокой точностью. Это может спасти тысячи жизней. Алгоритм использует машинное обучение для анализа паттернов.',
          source: 'GeoScience',
          sourceUrl: 'https://example.com/news/3',
          url: 'https://example.com/news/3',
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
          publishedAt: new Date('2024-01-15T11:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 92,
          aiComment: 'Очень актуальная тема с высоким эмоциональным воздействием',
          createdAt: new Date('2024-01-15T11:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T11:30:00Z').toISOString(),
        },
      ];

      const { status } = req.query;
      let filtered = mockNews;
      if (status && typeof status === 'string') {
        filtered = mockNews.filter((n) => n.status === status);
      }

      return res.json({
        items: filtered,
        total: filtered.length,
        limit: 50,
        offset: 0,
      });
    }

    const { status, source, limit = '50', offset = '0' } = req.query;
    
    // Проверяем доступность БД
    if (!db) {
      // БД недоступна - возвращаем мок данные
      const mockNews = [
        {
          id: 'mock-news-1',
          title: 'Искусственный интеллект научился создавать реалистичные видео',
          content: 'Новая модель от OpenAI может генерировать видео по текстовому описанию. Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд.',
          fullContent: 'Новая модель от OpenAI может генерировать видео по текстовому описанию. Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд. Это открывает новые возможности для создания контента.',
          source: 'TechNews',
          sourceUrl: 'https://example.com/news/1',
          url: 'https://example.com/news/1',
          imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
          publishedAt: new Date('2024-01-15T09:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 85,
          aiComment: 'Актуальная тема с высоким потенциалом вирусности',
          createdAt: new Date('2024-01-15T09:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T09:30:00Z').toISOString(),
        },
        {
          id: 'mock-news-2',
          title: 'Учёные создали материал, который может самовосстанавливаться',
          content: 'Материал из MIT может автоматически восстанавливаться при повреждении. Это открывает новые возможности для создания долговечных конструкций.',
          fullContent: 'Материал из MIT может автоматически восстанавливаться при повреждении. Это открывает новые возможности для создания долговечных конструкций. Технология может быть использована в различных отраслях.',
          source: 'ScienceDaily',
          sourceUrl: 'https://example.com/news/2',
          url: 'https://example.com/news/2',
          imageUrl: 'https://images.unsplash.com/photo-1532619675605-1ede6c4ed2b0?w=800',
          publishedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 78,
          aiComment: 'Интересная научная новость с практическим применением',
          createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
        },
        {
          id: 'mock-news-3',
          title: 'Новый алгоритм ИИ может предсказывать землетрясения за неделю',
          content: 'Система анализирует данные сейсмографов и предсказывает землетрясения с высокой точностью. Это может спасти тысячи жизней.',
          fullContent: 'Система анализирует данные сейсмографов и предсказывает землетрясения с высокой точностью. Это может спасти тысячи жизней. Алгоритм использует машинное обучение для анализа паттернов.',
          source: 'GeoScience',
          sourceUrl: 'https://example.com/news/3',
          url: 'https://example.com/news/3',
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
          publishedAt: new Date('2024-01-15T11:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 92,
          aiComment: 'Очень актуальная тема с высоким эмоциональным воздействием',
          createdAt: new Date('2024-01-15T11:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T11:30:00Z').toISOString(),
        },
      ];

      const statusFilter = status && typeof status === 'string' ? status : undefined;
      let filtered = mockNews;
      if (statusFilter) {
        filtered = mockNews.filter((n) => n.status === statusFilter);
      }

      return res.json({
        items: filtered,
        total: filtered.length,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });
    }
    
    // Проверяем, есть ли данные в БД
    let newsCount = [];
    try {
      newsCount = await db.select().from(newsItems).limit(1);
    } catch (dbError) {
      // Если ошибка БД - возвращаем мок данные
      console.warn('[News] Ошибка подключения к БД, возвращаем мок данные:', dbError);
      const mockNews = [
        {
          id: 'mock-news-1',
          title: 'Искусственный интеллект научился создавать реалистичные видео',
          content: 'Новая модель от OpenAI может генерировать видео по текстовому описанию. Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд.',
          source: 'TechNews',
          url: 'https://example.com/news/1',
          publishedAt: new Date('2024-01-15T09:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 85,
          aiComment: 'Актуальная тема с высоким потенциалом вирусности',
          createdAt: new Date('2024-01-15T09:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T09:30:00Z').toISOString(),
          fullContent: 'Новая модель от OpenAI может генерировать видео по текстовому описанию. Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд. Это открывает новые возможности для создания контента.',
          sourceUrl: 'https://example.com/news/1',
          imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        },
        {
          id: 'mock-news-2',
          title: 'Учёные создали материал, который может самовосстанавливаться',
          content: 'Материал из MIT может автоматически восстанавливаться при повреждении. Это открывает новые возможности для создания долговечных конструкций.',
          source: 'ScienceDaily',
          url: 'https://example.com/news/2',
          publishedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 78,
          aiComment: 'Интересная научная новость с практическим применением',
          createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
          fullContent: 'Материал из MIT может автоматически восстанавливаться при повреждении. Это открывает новые возможности для создания долговечных конструкций. Технология может быть использована в различных отраслях.',
          sourceUrl: 'https://example.com/news/2',
          imageUrl: 'https://images.unsplash.com/photo-1532619675605-1ede6c4ed2b0?w=800',
        },
        {
          id: 'mock-news-3',
          title: 'Новый алгоритм ИИ может предсказывать землетрясения за неделю',
          content: 'Система анализирует данные сейсмографов и предсказывает землетрясения с высокой точностью. Это может спасти тысячи жизней.',
          source: 'GeoScience',
          url: 'https://example.com/news/3',
          publishedAt: new Date('2024-01-15T11:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 92,
          aiComment: 'Очень актуальная тема с высоким эмоциональным воздействием',
          createdAt: new Date('2024-01-15T11:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T11:30:00Z').toISOString(),
          fullContent: 'Система анализирует данные сейсмографов и предсказывает землетрясения с высокой точностью. Это может спасти тысячи жизней. Алгоритм использует машинное обучение для анализа паттернов.',
          sourceUrl: 'https://example.com/news/3',
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        },
      ];

      const statusFilter = status && typeof status === 'string' ? status : undefined;
      let filtered = mockNews;
      if (statusFilter) {
        filtered = mockNews.filter((n) => n.status === statusFilter);
      }

      return res.json({
        items: filtered,
        total: filtered.length,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });
    }
    
    // Если БД пустая - возвращаем мок данные
    if (newsCount.length === 0) {
      const mockNews = [
        {
          id: 'mock-news-1',
          title: 'Искусственный интеллект научился создавать реалистичные видео',
          content: 'Новая модель от OpenAI может генерировать видео по текстовому описанию. Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд.',
          source: 'TechNews',
          url: 'https://example.com/news/1',
          publishedAt: new Date('2024-01-15T09:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 85,
          aiComment: 'Актуальная тема с высоким потенциалом вирусности',
          createdAt: new Date('2024-01-15T09:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T09:30:00Z').toISOString(),
          fullContent: 'Новая модель от OpenAI может генерировать видео по текстовому описанию. Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд. Это открывает новые возможности для создания контента.',
          sourceUrl: 'https://example.com/news/1',
          imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        },
        {
          id: 'mock-news-2',
          title: 'Учёные создали материал, который может самовосстанавливаться',
          content: 'Материал из MIT может автоматически восстанавливаться при повреждении. Это открывает новые возможности для создания долговечных конструкций.',
          source: 'ScienceDaily',
          url: 'https://example.com/news/2',
          publishedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 78,
          aiComment: 'Интересная научная новость с практическим применением',
          createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T10:30:00Z').toISOString(),
          fullContent: 'Материал из MIT может автоматически восстанавливаться при повреждении. Это открывает новые возможности для создания долговечных конструкций. Технология может быть использована в различных отраслях.',
          sourceUrl: 'https://example.com/news/2',
          imageUrl: 'https://images.unsplash.com/photo-1532619675605-1ede6c4ed2b0?w=800',
        },
        {
          id: 'mock-news-3',
          title: 'Новый алгоритм ИИ может предсказывать землетрясения за неделю',
          content: 'Система анализирует данные сейсмографов и предсказывает землетрясения с высокой точностью. Это может спасти тысячи жизней.',
          source: 'GeoScience',
          url: 'https://example.com/news/3',
          publishedAt: new Date('2024-01-15T11:00:00Z').toISOString(),
          status: 'selected',
          aiScore: 92,
          aiComment: 'Очень актуальная тема с высоким эмоциональным воздействием',
          createdAt: new Date('2024-01-15T11:30:00Z').toISOString(),
          updatedAt: new Date('2024-01-15T11:30:00Z').toISOString(),
          fullContent: 'Система анализирует данные сейсмографов и предсказывает землетрясения с высокой точностью. Это может спасти тысячи жизней. Алгоритм использует машинное обучение для анализа паттернов.',
          sourceUrl: 'https://example.com/news/3',
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        },
      ];

      const statusFilter = status && typeof status === 'string' ? status : undefined;
      let filtered = mockNews;
      if (statusFilter) {
        filtered = mockNews.filter((n) => n.status === statusFilter);
      }

      return res.json({
        items: filtered,
        total: filtered.length,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });
    }

    // Строим условия фильтрации
    const conditions = [];

    if (status && typeof status === 'string') {
      conditions.push(eq(newsItems.status, status as any));
    }

    if (source && typeof source === 'string') {
      conditions.push(eq(newsItems.source, source));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Получаем общее количество (делаем отдельный запрос для подсчета)
    const totalResult = whereClause
      ? await db.select().from(newsItems).where(whereClause)
      : await db.select().from(newsItems);
    
    const total = totalResult.length;

    // Получаем новости с пагинацией
    const items = await db
      .select()
      .from(newsItems)
      .where(whereClause)
      .orderBy(desc(newsItems.publishedAt))
      .limit(parseInt(limit as string, 10))
      .offset(parseInt(offset as string, 10));

    res.json({
      items,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('[News] Ошибка при получении новостей:', error);
    res.status(500).json({ error: 'Ошибка при получении новостей', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/news/:id/score - проскорить одну новость
router.post('/:id/score', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Получаем новость из БД
    const [news] = await db
      .select()
      .from(newsItems)
      .where(eq(newsItems.id, id))
      .limit(1);

    if (!news) {
      return res.status(404).json({ 
        error: 'Новость не найдена', 
        code: 'NOT_FOUND' 
      });
    }

    // Скорим новость
    const result = await scoreNewsItem(news);

    res.json(result);
  } catch (error) {
    console.error('[News] Ошибка при скоринге новости:', error);
    res.status(500).json({ 
      error: 'Ошибка при скоринге новости', 
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/news/:id - одна новость
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [news] = await db
      .select()
      .from(newsItems)
      .where(eq(newsItems.id, id))
      .limit(1);

    if (!news) {
      return res.status(404).json({ 
        error: 'Новость не найдена', 
        code: 'NOT_FOUND' 
      });
    }

    res.json(news);
  } catch (error) {
    console.error('[News] Ошибка при получении новости:', error);
    res.status(500).json({ error: 'Ошибка при получении новости', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/news/refresh - запустить парсинг всех источников
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    console.log('[News] Запуск парсинга всех RSS источников');
    
    const result = await parseAllSources();

    res.json({ 
      added: result.added,
      message: `Добавлено новых новостей: ${result.added}` 
    });
  } catch (error) {
    console.error('[News] Ошибка при парсинге источников:', error);
    res.status(500).json({ 
      error: 'Ошибка при парсинге источников', 
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/news/score-all - проскорить все новости со статусом 'new'
router.post('/score-all', async (req: Request, res: Response) => {
  try {
    const { minStatus = 'new' } = req.query;

    console.log(`[News] Запуск скоринга всех новостей со статусом: ${minStatus}`);

    // Получаем все новости со статусом 'new'
    const newsToScore = await db
      .select()
      .from(newsItems)
      .where(eq(newsItems.status, minStatus as string));

    if (newsToScore.length === 0) {
      return res.json({ 
        scored: 0,
        message: 'Нет новостей для скоринга' 
      });
    }

    console.log(`[News] Найдено ${newsToScore.length} новостей для скоринга`);

    let scored = 0;
    let errors = 0;

    // Скорим каждую новость
    for (const news of newsToScore) {
      try {
        await scoreNewsItem(news);
        scored++;
      } catch (error) {
        console.error(`[News] Ошибка при скоринге новости ${news.id}:`, error);
        errors++;
        // Продолжаем обработку остальных новостей
      }
    }

    res.json({ 
      scored,
      errors,
      total: newsToScore.length,
      message: `Проскорировано: ${scored}, ошибок: ${errors}` 
    });
  } catch (error) {
    console.error('[News] Ошибка при массовом скоринге:', error);
    res.status(500).json({ 
      error: 'Ошибка при массовом скоринге', 
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/news/:id - обновить статус новости
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Валидация статуса
    const validStatuses = ['new', 'scored', 'selected', 'used', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Некорректный статус. Допустимые значения: ${validStatuses.join(', ')}`, 
        code: 'INVALID_STATUS' 
      });
    }

    // Проверяем существование новости
    const [existing] = await db
      .select()
      .from(newsItems)
      .where(eq(newsItems.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ 
        error: 'Новость не найдена', 
        code: 'NOT_FOUND' 
      });
    }

    // Обновляем статус
    const updateData: { status?: any; updatedAt?: Date } = {};
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(newsItems)
      .set(updateData)
      .where(eq(newsItems.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('[News] Ошибка при обновлении новости:', error);
    res.status(500).json({ error: 'Ошибка при обновлении новости', code: 'INTERNAL_ERROR' });
  }
});

// DELETE /api/news/:id - удалить новость
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Проверяем существование новости
    const [existing] = await db
      .select()
      .from(newsItems)
      .where(eq(newsItems.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ 
        error: 'Новость не найдена', 
        code: 'NOT_FOUND' 
      });
    }

    // Удаляем новость
    await db
      .delete(newsItems)
      .where(eq(newsItems.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('[News] Ошибка при удалении новости:', error);
    res.status(500).json({ error: 'Ошибка при удалении новости', code: 'INTERNAL_ERROR' });
  }
});

export default router;
