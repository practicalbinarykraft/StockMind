/**
 * Generation Pipeline — News Query & Auto-Parsing
 */
import { db } from "../../../db";
import { rssItems, autoScripts, rssSources } from "@shared/schema";
import { eq, and, or, sql, desc, gte, inArray, isNull } from "drizzle-orm";
import { generationSSE } from "./../generation-sse";
import { parseRssSource } from "../../../lib/rss-background-tasks";

export async function getNewsForGeneration(
  userId: string,
  limit: number = 10,
  maxAgeDays?: number,
  autoParseIfNeeded: boolean = false,
  minScoreThreshold: number = 70,
): Promise<any[]> {
  console.log(
    `[Pipeline] getNewsForGeneration: userId=${userId}, limit=${limit}, maxAgeDays=${maxAgeDays}, minScoreThreshold=${minScoreThreshold}, autoParseIfNeeded=${autoParseIfNeeded}`,
  );

  const existingScripts = await db
    .select({ sourceItemId: autoScripts.sourceItemId })
    .from(autoScripts)
    .where(eq(autoScripts.userId, userId));

  const existingNewsIds = new Set(existingScripts.map((s) => s.sourceItemId));
  console.log(
    `[Pipeline] Уже создано сценариев для ${existingNewsIds.size} новостей`,
  );

  const cutoffDate =
    maxAgeDays && maxAgeDays > 0
      ? new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
      : null;

  if (cutoffDate) {
    console.log(
      `[Pipeline] Фильтр по дате: новости новее ${cutoffDate.toISOString()}`,
    );
  }

  let filtered = await fetchFilteredNews(
    userId,
    limit,
    minScoreThreshold,
    cutoffDate,
    existingNewsIds,
  );

  if (filtered.length < limit && autoParseIfNeeded) {
    console.log(
      `[Pipeline] Найдено только ${filtered.length} из ${limit} новостей, запускаем автоматический парсинг`,
    );
    await parseAllUserSources(userId);

    const updatedExistingScripts = await db
      .select({ sourceItemId: autoScripts.sourceItemId })
      .from(autoScripts)
      .where(eq(autoScripts.userId, userId));
    const updatedExistingNewsIds = new Set(
      updatedExistingScripts.map((s) => s.sourceItemId),
    );

    filtered = await fetchFilteredNews(
      userId,
      limit,
      minScoreThreshold,
      cutoffDate,
      updatedExistingNewsIds,
    );
    console.log(
      `[Pipeline] После автопарсинга найдено новостей: ${filtered.length}`,
    );
  }

  console.log(
    `[Pipeline] ИТОГО возвращается новостей: ${filtered.length} из запрошенных ${limit}`,
  );
  if (filtered.length < limit) {
    console.log(
      `[Pipeline] ⚠️  Новостей меньше запрошенного! minScore=${minScoreThreshold}, maxAge=${maxAgeDays || "нет"}, обработано=${existingNewsIds.size}`,
    );
  }

  return filtered;
}

function buildNewsQuery(
  userId: string,
  minScoreThreshold: number,
  cutoffDate: Date | null,
) {
  return and(
    or(eq(rssItems.userId, userId), sql`${rssItems.userId} IS NULL`),
    or(
      eq(rssItems.userAction, "selected"),
      and(
        sql`${rssItems.aiScore} >= ${minScoreThreshold}`,
        or(
          sql`${rssItems.userAction} IS NULL`,
          sql`${rssItems.userAction} != 'dismissed'`,
        ),
      ),
    ),
    cutoffDate
      ? or(
          gte(rssItems.publishedAt, cutoffDate),
          sql`${rssItems.publishedAt} IS NULL`,
        )
      : sql`1=1`,
  );
}

async function fetchFilteredNews(
  userId: string,
  limit: number,
  minScoreThreshold: number,
  cutoffDate: Date | null,
  existingNewsIds: Set<string>,
): Promise<any[]> {
  const batchSize = 50;
  let offset = 0;
  const filtered: any[] = [];
  const whereClause = buildNewsQuery(userId, minScoreThreshold, cutoffDate);

  while (filtered.length < limit) {
    const batch = await db
      .select()
      .from(rssItems)
      .where(whereClause)
      .orderBy(desc(rssItems.publishedAt))
      .limit(batchSize)
      .offset(offset);

    if (batch.length === 0) break;

    const batchWithoutScripts = batch.filter(
      (news) => !existingNewsIds.has(news.id),
    );
    const batchFiltered = cutoffDate
      ? batchWithoutScripts.filter((n) => {
          const newsDate = n.publishedAt || n.parsedAt;
          if (!newsDate) return true;
          return new Date(newsDate) >= cutoffDate;
        })
      : batchWithoutScripts;

    filtered.push(...batchFiltered);
    if (filtered.length >= limit) return filtered.slice(0, limit);
    offset += batchSize;
  }

  return filtered;
}

export async function parseAllUserSources(userId: string): Promise<void> {
  try {
    console.log(
      `[Pipeline] Запуск парсинга всех источников для userId: ${userId}`,
    );

    const sources = await db
      .select()
      .from(rssSources)
      .where(and(eq(rssSources.userId, userId), eq(rssSources.isActive, true)));

    console.log(`[Pipeline] Найдено активных источников: ${sources.length}`);
    if (sources.length === 0) return;

    generationSSE.sendEvent(userId, {
      type: "parsing_started",
      data: {
        message: `Запущен парсинг ${sources.length} источников`,
        sourcesCount: sources.length,
      },
    });

    const parsePromises = sources.map((source) =>
      parseRssSource(source.id, source.url, userId).catch((err) => {
        console.error(
          `[Pipeline] Ошибка парсинга источника ${source.id}:`,
          err,
        );
      }),
    );
    await Promise.allSettled(parsePromises);

    console.log(`[Pipeline] Парсинг завершён, ожидаем оценки новостей...`);
    const { waitForAllScoring } =
      await import("../../../lib/rss-background-tasks");

    generationSSE.sendEvent(userId, {
      type: "scoring_started",
      data: { message: `Оцениваем новости с помощью AI...` },
    });
    await waitForAllScoring(120000);
    console.log(`[Pipeline] Оценка новых новостей завершена`);

    // Score existing items that have no AI score yet
    const sourceIds = sources.map((s) => s.id);
    if (sourceIds.length > 0) {
      const unscoredItems = await db
        .select()
        .from(rssItems)
        .where(
          and(inArray(rssItems.sourceId, sourceIds), isNull(rssItems.aiScore)),
        )
        .orderBy(desc(rssItems.publishedAt))
        .limit(50);

      if (unscoredItems.length > 0) {
        console.log(
          `[Pipeline] Найдено ${unscoredItems.length} неоценённых новостей, запускаем оценку...`,
        );
        generationSSE.sendEvent(userId, {
          type: "scoring_started",
          data: {
            message: `Оцениваем ${unscoredItems.length} ранее не оценённых новостей...`,
          },
        });
        const { scoreRssItems: scoreExistingItems } =
          await import("../../../routes/helpers/background-tasks");
        await scoreExistingItems(unscoredItems, userId);
        console.log(`[Pipeline] Оценка неоценённых новостей завершена`);
      }
    }

    generationSSE.sendEvent(userId, {
      type: "parsing_completed",
      data: {
        message: `Парсинг и оценка ${sources.length} источников завершены`,
        sourcesCount: sources.length,
      },
    });
  } catch (error: any) {
    console.error(`[Pipeline] Ошибка при парсинге источников:`, error);
    generationSSE.sendEvent(userId, {
      type: "parsing_error",
      data: { message: `Ошибка парсинга источников: ${error.message}` },
    });
  }
}
