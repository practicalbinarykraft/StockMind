import { callLLMSimple, LLMProvider } from '../lib/llm-provider';
import { db } from '../db';
import { newsItems, NewsItem, aiSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

// Типы
export interface ScoreResult {
  score: number;
  comment: string;
  breakdown: {
    facts: number;
    relevance: number;
    audience: number;
    interest: number;
  };
}

/**
 * Получить провайдера из настроек
 */
async function getProviderFromSettings(): Promise<LLMProvider> {
  try {
    const [settings] = await db.select().from(aiSettings).limit(1);
    return (settings?.provider as LLMProvider) || 'anthropic';
  } catch {
    return 'anthropic';
  }
}

/**
 * Оценка новости через AI
 */
export async function scoreNewsItem(newsItem: NewsItem): Promise<ScoreResult> {
  const provider = await getProviderFromSettings();

  const systemPrompt = `Ты - эксперт по вирусному контенту. Оцени новость по шкале 0-100.

КРИТЕРИИ:
1. Конкретные факты/цифры (0-35): есть ли цифры, даты, статистика?
2. Актуальность (0-25): горячая тема или устаревшая?
3. Широта аудитории (0-20): интересно многим или нише?
4. Захватывающесть (0-20): вызывает ли эмоции, удивление?

ФОРМАТ ОТВЕТА (СТРОГО JSON, без markdown):
{
  "score": 75,
  "comment": "Краткое объяснение оценки (1-2 предложения)",
  "breakdown": {
    "facts": 25,
    "relevance": 20,
    "audience": 15,
    "interest": 15
  }
}

ВАЖНО: Верни ТОЛЬКО валидный JSON, без дополнительного текста или markdown разметки.`;

  const userPrompt = `НОВОСТЬ:
Заголовок: ${newsItem.title}
Содержание: ${newsItem.content || newsItem.fullContent || 'Нет содержания'}`;

  try {
    console.log(`[News Scorer] Оценка новости: ${newsItem.title} (провайдер: ${provider})`);

    // Вызываем LLM
    const response = await callLLMSimple(provider, systemPrompt, userPrompt, 512);

    // Парсим JSON из ответа (убираем markdown code blocks если есть)
    let jsonString = response.trim();
    
    // Убираем markdown code blocks
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const result: ScoreResult = JSON.parse(jsonString);

    // Валидация результата
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      throw new Error('Некорректный score в ответе AI');
    }

    if (!result.comment || typeof result.comment !== 'string') {
      throw new Error('Некорректный comment в ответе AI');
    }

    if (!result.breakdown || typeof result.breakdown !== 'object') {
      throw new Error('Некорректный breakdown в ответе AI');
    }

    // Обновляем новость в БД
    await db
      .update(newsItems)
      .set({
        aiScore: result.score,
        aiComment: result.comment,
        status: 'scored',
        updatedAt: new Date(),
      })
      .where(eq(newsItems.id, newsItem.id));

    console.log(`[News Scorer] Новость оценена: ${result.score}/100`);

    return result;
  } catch (error) {
    console.error(`[News Scorer] Ошибка при оценке новости ${newsItem.id}:`, error);
    
    // Если ошибка парсинга JSON, пробуем извлечь JSON из ответа
    if (error instanceof SyntaxError) {
      throw new Error(`Ошибка парсинга ответа AI: ${error.message}`);
    }
    
    throw error;
  }
}
