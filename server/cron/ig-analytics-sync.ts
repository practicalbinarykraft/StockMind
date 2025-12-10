import cron from "node-cron";
import { syncInstagramData } from "../ig-sync-service";
import type { IStorage } from "../storage";

let storage: IStorage;
let isRunning = false;

/**
 * Инициализирует cron job для синхронизации Instagram Analytics
 * Запускается каждые 15 минут для проверки медиа, требующих синхронизации
 */
export function initIgAnalyticsSync(storageInstance: IStorage) {
  storage = storageInstance;

  // Запуск каждые 15 минут
  // cron.schedule('*/15 * * * *', async () => {
  //   console.log('[IG Analytics Sync] Starting scheduled synchronization...');
  //   await runSync();
  // }, {
  //   timezone: process.env.CRON_TZ || 'UTC'
  // });

  // console.log('[IG Analytics Sync] Cron job initialized (runs every 15 minutes)');

  // // Запуск сразу при старте (неблокирующий)
  // runSync().catch((error) => {
  //   console.error('[IG Analytics Sync] Startup sync failed:', error);
  // });
}

/**
 * Выполняет синхронизацию с защитой от одновременного запуска
 */
async function runSync() {
  if (isRunning) {
    console.log("[IG Analytics Sync] Skip: previous sync still running");
    return;
  }

  isRunning = true;
  const started = Date.now();

  try {
    await syncInstagramData();

    const duration = Math.round((Date.now() - started) / 1000);
    console.log(`[IG Analytics Sync] Completed in ${duration}s`);
  } catch (error) {
    console.error("[IG Analytics Sync] Critical error:", error);
  } finally {
    isRunning = false;
  }
}
