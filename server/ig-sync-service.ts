import { storage } from './storage';
import { getInstagramMedia, getMediaInsights, GraphAPIClientError } from './ig-graph-client';
import * as encryption from './encryption';
import type { IgAccount, IgMedia } from '@shared/schema';

/**
 * Instagram Sync Service
 * Автоматическая синхронизация медиа и метрик из Instagram Graph API
 */

// Конфигурация для экспоненциального backoff при rate limiting
const RETRY_DELAYS = [1000, 3000, 7000]; // 1s → 3s → 7s

// Возраст публикации для разного расписания синхронизации
const FRESH_CONTENT_HOURS = 48;
const HOURLY_SYNC_INTERVAL = 60 * 60 * 1000; // 1 час
const DAILY_SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Вычисляет следующую дату синхронизации на основе возраста публикации
 */
function calculateNextSyncAt(publishedAt: Date): Date {
  const now = new Date();
  const ageInHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

  if (ageInHours < FRESH_CONTENT_HOURS) {
    // Свежий контент: синхронизация каждый час
    return new Date(now.getTime() + HOURLY_SYNC_INTERVAL);
  } else {
    // Старый контент: синхронизация раз в день
    return new Date(now.getTime() + DAILY_SYNC_INTERVAL);
  }
}

/**
 * Синхронизирует медиа для конкретного аккаунта
 */
export async function pullMediaForAccount(account: IgAccount): Promise<{ success: boolean; error?: string }> {
  try {
    // Проверяем срок действия токена
    if (new Date(account.tokenExpiresAt) < new Date()) {
      return { success: false, error: 'Token expired' };
    }

    // Расшифровываем токен
    const accessToken = encryption.decrypt(account.accessTokenEncrypted);

    // Получаем медиа из Instagram API
    let allMedia: any[] = [];
    let after: string | undefined;
    let hasMore = true;

    // Пагинация для получения всех медиа (лимит 100 за раз)
    while (hasMore) {
      const response = await getInstagramMedia(
        account.igUserId,
        accessToken,
        {
          limit: 100,
          after,
          mediaType: 'REEL', // Только Reels
        }
      );

      allMedia = [...allMedia, ...response.data];

      if (response.paging?.next && response.paging?.cursors?.after) {
        after = response.paging.cursors.after;
      } else {
        hasMore = false;
      }
    }

    // Upsert медиа в базу данных
    for (const media of allMedia) {
      await storage.upsertIgMedia({
        igAccountId: account.id,
        igMediaId: media.id,
        permalink: media.permalink,
        mediaType: media.media_type as any,
        caption: media.caption,
        thumbnailUrl: media.thumbnail_url,
        publishedAt: new Date(media.timestamp),
        syncStatus: 'idle',
      });
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('[IG Sync] Error pulling media for account:', account.id, error);
    
    if (error instanceof GraphAPIClientError) {
      return { success: false, error: `${error.errorType}: ${error.message}` };
    }

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Синхронизирует инсайты для конкретного медиа с экспоненциальным backoff
 */
export async function pullInsightsForMedia(
  media: IgMedia,
  account: IgAccount,
  retryCount = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    // Проверяем срок действия токена
    if (new Date(account.tokenExpiresAt) < new Date()) {
      return { success: false, error: 'Token expired' };
    }

    // Расшифровываем токен
    const accessToken = encryption.decrypt(account.accessTokenEncrypted);

    // Получаем инсайты из Instagram API
    const insights = await getMediaInsights(media.igMediaId, accessToken);

    // Преобразуем инсайты в объект метрик
    const metrics: Record<string, number> = {};
    for (const insight of insights.data) {
      if (typeof insight.values?.[0]?.value === 'number') {
        metrics[insight.name] = insight.values[0].value;
      }
    }

    // Сохраняем инсайты в базу данных
    await storage.createIgMediaInsight({
      igMediaId: media.id,
      metrics,
      collectedAt: new Date(),
    });

    // Обновляем статус и расписание синхронизации медиа
    await storage.updateIgMediaSync(media.id, 'synced', null, calculateNextSyncAt(media.publishedAt));

    return { success: true };
  } catch (error: unknown) {
    console.error('[IG Sync] Error pulling insights for media:', media.id, error);

    if (error instanceof GraphAPIClientError) {
      // Rate limiting: применяем экспоненциальный backoff
      if (error.statusCode === 429 && retryCount < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryCount];
        console.log(`[IG Sync] Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_DELAYS.length})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return pullInsightsForMedia(media, account, retryCount + 1);
      }

      // Обновляем статус медиа на ошибку
      await storage.updateIgMediaSync(
        media.id,
        'error',
        `${error.errorType}: ${error.message}`,
        calculateNextSyncAt(media.publishedAt)
      );

      return { success: false, error: `${error.errorType}: ${error.message}` };
    }

    // Неизвестная ошибка
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await storage.updateIgMediaSync(
      media.id,
      'error',
      errorMessage,
      calculateNextSyncAt(media.publishedAt)
    );

    return { success: false, error: errorMessage };
  }
}

/**
 * Главная функция синхронизации - проверяет все аккаунты и медиа
 */
export async function syncInstagramData(): Promise<void> {
  const startTime = Date.now();
  console.log('[IG Sync] Starting Instagram data synchronization...');

  try {
    // Получаем все аккаунты для проверки
    const allAccounts = await storage.getAllIgAccounts();
    console.log(`[IG Sync] Found ${allAccounts.length} Instagram accounts`);

    if (allAccounts.length === 0) {
      console.log('[IG Sync] No accounts to sync');
      return;
    }

    // Проходим по каждому аккаунту
    for (const account of allAccounts) {
      console.log(`[IG Sync] Processing account: ${account.igUsername} (${account.id})`);

      // Проверяем срок действия токена
      const tokenExpiresAt = new Date(account.tokenExpiresAt);
      const now = new Date();
      const daysUntilExpiry = (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Пропускаем аккаунты с истёкшим токеном
      if (daysUntilExpiry < 0) {
        console.log(`[IG Sync] Skipping account ${account.igUsername}: token expired`);
        continue;
      }

      // Предупреждаем о скором истечении токена
      if (daysUntilExpiry < 14) {
        console.log(`[IG Sync] Warning: token for ${account.igUsername} expires in ${Math.floor(daysUntilExpiry)} days`);
      }

      // Синхронизируем медиа (новые и обновлённые)
      const mediaResult = await pullMediaForAccount(account);
      if (!mediaResult.success) {
        console.error(`[IG Sync] Failed to pull media for ${account.igUsername}: ${mediaResult.error}`);
        continue;
      }

      // Получаем все медиа для этого аккаунта, требующие синхронизации
      const allMedia = await storage.getIgMedia(account.id);
      const mediaNeedingSync = allMedia.filter(m => {
        // Синхронизируем, если:
        // 1. Нет nextSyncAt (первая синхронизация)
        // 2. Или nextSyncAt уже прошёл
        return !m.nextSyncAt || new Date(m.nextSyncAt) <= now;
      });

      console.log(`[IG Sync] Found ${mediaNeedingSync.length}/${allMedia.length} media items needing sync for ${account.igUsername}`);

      // Синхронизируем инсайты для каждого медиа
      let successCount = 0;
      let errorCount = 0;

      for (const media of mediaNeedingSync) {
        // Устанавливаем статус "syncing" перед началом
        await storage.updateIgMediaSync(media.id, 'syncing');

        const insightsResult = await pullInsightsForMedia(media, account);
        
        if (insightsResult.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Небольшая задержка между запросами для избежания rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`[IG Sync] Completed sync for ${account.igUsername}: ${successCount} success, ${errorCount} errors`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[IG Sync] Synchronization completed in ${duration}s`);
  } catch (error) {
    console.error('[IG Sync] Critical error during synchronization:', error);
  }
}

/**
 * Получает все Instagram аккаунты (для cron job)
 */
export async function getAllAccountsForSync(): Promise<IgAccount[]> {
  try {
    return await storage.getAllIgAccounts();
  } catch (error: unknown) {
    console.error('[IG Sync] Error getting accounts for sync:', error);
    return [];
  }
}
