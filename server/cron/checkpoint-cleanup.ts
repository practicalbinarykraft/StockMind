/**
 * Checkpoint Cleanup Cron Job
 * Удаляет истёкшие checkpoint'ы (старше 7 дней)
 */
import cron from "node-cron";
import { logger } from "../lib/logger";
import { scriptsLibraryService } from "../modules/scripts-library/scripts-library.service";

/**
 * Очистка истёкших checkpoint'ов
 * Запускается каждый день в 3:00 AM
 */
async function cleanupExpiredCheckpoints() {
  const startTime = Date.now();
  
  try {
    logger.info('[Checkpoint Cleanup] Starting cleanup of expired checkpoints...');
    
    const deletedCount = await scriptsLibraryService.deleteExpiredCheckpoints();
    
    const duration = Date.now() - startTime;
    
    logger.info('[Checkpoint Cleanup] Cleanup completed', {
      deletedCount,
      duration: `${duration}ms`,
    });
  } catch (error: any) {
    logger.error('[Checkpoint Cleanup] Error during cleanup:', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Инициализация cron job для очистки checkpoint'ов
 */
export function initCheckpointCleanup() {
  // Запускать каждый день в 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    await cleanupExpiredCheckpoints();
  }, {
    timezone: process.env.CRON_TZ || 'UTC'
  });

  logger.info('[Checkpoint Cleanup] Cron job initialized', { 
    schedule: 'Daily at 3:00 AM',
    timezone: process.env.CRON_TZ || 'UTC'
  });
}

/**
 * Ручной запуск очистки (для тестирования или административных целей)
 */
export async function runCheckpointCleanupManually() {
  logger.info('[Checkpoint Cleanup] Manual cleanup triggered');
  await cleanupExpiredCheckpoints();
}
