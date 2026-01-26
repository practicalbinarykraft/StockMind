import Parser from 'rss-parser';
import { db } from '../db';
import { rssSources, newsItems } from '../db/schema';
import { eq } from 'drizzle-orm';

// Типы
export interface ParsedItem {
  title: string;
  content: string;
  link: string;
  pubDate: Date | null;
  imageUrl: string | null;
}

// Создаем экземпляр парсера
const parser = new Parser();

/**
 * Очистка HTML контента
 * Удаляет HTML теги, лишние пробелы, обрезает до 500 символов
 */
export function cleanContent(html: string): string {
  if (!html) return '';

  // Удаляем HTML теги
  let cleaned = html.replace(/<[^>]*>/g, ' ');

  // Декодируем HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Удаляем лишние пробелы и переносы строк
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Удаляем фразы типа "Read more...", "Continue reading"
  cleaned = cleaned.replace(/read\s+more[^\w]*/gi, '');
  cleaned = cleaned.replace(/continue\s+reading[^\w]*/gi, '');
  cleaned = cleaned.replace(/читать\s+далее[^\w]*/gi, '');
  cleaned = cleaned.replace(/подробнее[^\w]*/gi, '');

  // Обрезаем до 500 символов
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 500).trim();
    // Убираем обрезанное слово в конце
    cleaned = cleaned.replace(/\s+\w+$/, '') + '...';
  }

  return cleaned;
}

/**
 * Парсинг одного RSS источника
 */
export async function parseRssSource(sourceUrl: string): Promise<ParsedItem[]> {
  try {
    console.log(`[RSS Parser] Парсинг источника: ${sourceUrl}`);

    const feed = await parser.parseURL(sourceUrl);
    const items: ParsedItem[] = [];

    if (!feed.items || feed.items.length === 0) {
      console.log(`[RSS Parser] Источник ${sourceUrl} не содержит новостей`);
      return [];
    }

    for (const item of feed.items) {
      const parsedItem: ParsedItem = {
        title: item.title || 'Без заголовка',
        content: cleanContent(item.contentSnippet || item.content || item.summary || ''),
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate) : null,
        imageUrl: extractImageUrl(item) || null,
      };

      items.push(parsedItem);
    }

    console.log(`[RSS Parser] Получено ${items.length} новостей из ${sourceUrl}`);
    return items;
  } catch (error) {
    console.error(`[RSS Parser] Ошибка при парсинге ${sourceUrl}:`, error);
    throw error;
  }
}

/**
 * Извлечение URL изображения из элемента RSS
 */
function extractImageUrl(item: any): string | null {
  // Проверяем различные поля, где может быть изображение
  if (item.enclosure?.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  if (item['media:content']?.url) {
    return item['media:content'].url;
  }
  if (item['media:thumbnail']?.url) {
    return item['media:thumbnail'].url;
  }
  
  // Пытаемся найти изображение в HTML контенте
  const content = item.content || item['content:encoded'] || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }

  return null;
}

/**
 * Парсинг всех активных RSS источников и сохранение в БД
 */
export async function parseAllSources(): Promise<{ added: number }> {
  try {
    console.log('[RSS Parser] Начало парсинга всех активных источников');

    // Получаем все активные источники из БД
    const sources = await db
      .select()
      .from(rssSources)
      .where(eq(rssSources.isActive, true));

    if (sources.length === 0) {
      console.log('[RSS Parser] Нет активных источников для парсинга');
      return { added: 0 };
    }

    console.log(`[RSS Parser] Найдено ${sources.length} активных источников`);

    let totalAdded = 0;

    // Парсим каждый источник
    for (const source of sources) {
      try {
        const parsedItems = await parseRssSource(source.url);

        // Сохраняем новые новости в БД
        for (const item of parsedItems) {
          // Проверяем, нет ли уже такой новости по URL
          const existing = await db
            .select()
            .from(newsItems)
            .where(eq(newsItems.url, item.link))
            .limit(1);

          if (existing.length === 0 && item.link) {
            // Сохраняем новую новость
            await db.insert(newsItems).values({
              title: item.title,
              content: item.content,
              fullContent: item.content, // Пока полный контент = краткий
              source: source.name,
              sourceUrl: source.url,
              url: item.link,
              imageUrl: item.imageUrl,
              publishedAt: item.pubDate,
              status: 'new',
            });

            totalAdded++;
          }
        }

        // Обновляем lastFetchedAt у источника
        await db
          .update(rssSources)
          .set({ lastFetchedAt: new Date() })
          .where(eq(rssSources.id, source.id));

        console.log(`[RSS Parser] Источник "${source.name}" обработан, добавлено новостей: ${parsedItems.length}`);
      } catch (error) {
        console.error(`[RSS Parser] Ошибка при обработке источника "${source.name}":`, error);
        // Продолжаем обработку других источников
      }
    }

    console.log(`[RSS Parser] Парсинг завершен. Всего добавлено новых новостей: ${totalAdded}`);
    return { added: totalAdded };
  } catch (error) {
    console.error('[RSS Parser] Критическая ошибка при парсинге источников:', error);
    throw error;
  }
}
