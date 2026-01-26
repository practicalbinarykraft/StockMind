import { Router, Request, Response } from 'express';
import { db } from '../db';
import { rssSources } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { parseRssSource } from '../services/rss-parser';

const router = Router();

// GET /api/sources - список всех источников
router.get('/', async (req: Request, res: Response) => {
  try {
    const sources = await db
      .select()
      .from(rssSources)
      .orderBy(desc(rssSources.createdAt));

    res.json(sources);
  } catch (error) {
    console.error('[Sources] Ошибка при получении источников:', error);
    res.status(500).json({ error: 'Ошибка при получении источников', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/sources - добавить источник
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, url } = req.body;

    // Валидация
    if (!name || !url) {
      return res.status(400).json({ 
        error: 'Поля name и url обязательны', 
        code: 'VALIDATION_ERROR' 
      });
    }

    // Проверка валидности URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ 
        error: 'Некорректный URL', 
        code: 'INVALID_URL' 
      });
    }

    // Проверка что это валидный RSS (попробовать спарсить)
    try {
      await parseRssSource(url);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Не удалось распарсить RSS источник. Проверьте правильность URL.', 
        code: 'INVALID_RSS',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Проверка на дубликаты
    const existing = await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.url, url))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Источник с таким URL уже существует', 
        code: 'DUPLICATE_URL' 
      });
    }

    // Создаем источник
    const [newSource] = await db
      .insert(rssSources)
      .values({
        name,
        url,
        isActive: true,
      })
      .returning();

    res.status(201).json(newSource);
  } catch (error) {
    console.error('[Sources] Ошибка при создании источника:', error);
    res.status(500).json({ error: 'Ошибка при создании источника', code: 'INTERNAL_ERROR' });
  }
});

// PATCH /api/sources/:id - обновить источник
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    // Проверяем существование источника
    const [existing] = await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ 
        error: 'Источник не найден', 
        code: 'NOT_FOUND' 
      });
    }

    // Обновляем только переданные поля
    const updateData: { name?: string; isActive?: boolean } = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(rssSources)
      .set(updateData)
      .where(eq(rssSources.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('[Sources] Ошибка при обновлении источника:', error);
    res.status(500).json({ error: 'Ошибка при обновлении источника', code: 'INTERNAL_ERROR' });
  }
});

// DELETE /api/sources/:id - удалить источник
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Проверяем существование источника
    const [existing] = await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ 
        error: 'Источник не найден', 
        code: 'NOT_FOUND' 
      });
    }

    // Удаляем источник
    await db
      .delete(rssSources)
      .where(eq(rssSources.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('[Sources] Ошибка при удалении источника:', error);
    res.status(500).json({ error: 'Ошибка при удалении источника', code: 'INTERNAL_ERROR' });
  }
});

export default router;
