import { storage } from "../storage";
import { downloadInstagramMedia } from "../instagram-download";
import { transcribeInstagramVideo } from "../transcription-service";
import { scoreInstagramReel } from "../ai-services";

// ===========================================
// PROCESSING QUEUE CONFIGURATION
// ===========================================
// Ограничиваем параллелизм для предотвращения OOM на Linux
const QUEUE_CONFIG = {
  // Максимум параллельных загрузок видео
  MAX_CONCURRENT_DOWNLOADS: 2,
  // Максимум параллельных транскрипций (тяжёлые операции)
  MAX_CONCURRENT_TRANSCRIPTIONS: 1,
  // Максимум параллельных AI оценок
  MAX_CONCURRENT_SCORING: 1,
  // Задержка между операциями в очереди (ms)
  QUEUE_DELAY_MS: 500,
  // Максимум рилсов для авто-оценки за одну сессию парсинга
  MAX_AUTO_SCORE_PER_SESSION: 10,
};

// ===========================================
// PROCESSING QUEUE WITH CONCURRENCY LIMITS
// ===========================================

interface QueueTask {
  id: string;
  type: 'download' | 'transcribe' | 'score';
  execute: () => Promise<void>;
}

class ProcessingQueue {
  private downloadQueue: QueueTask[] = [];
  private transcribeQueue: QueueTask[] = [];
  private scoreQueue: QueueTask[] = [];
  
  private activeDownloads = 0;
  private activeTranscriptions = 0;
  private activeScoring = 0;
  
  // Счётчик оценённых рилсов по сессиям (sourceId -> count)
  private scoredCountBySession: Map<string, number> = new Map();
  
  // Очистка счётчиков сессий через 10 минут
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Добавить задачу загрузки в очередь
   */
  addDownload(taskId: string, execute: () => Promise<void>) {
    this.downloadQueue.push({ id: taskId, type: 'download', execute });
    console.log(`[Queue] 📥 Added download task: ${taskId} (queue: ${this.downloadQueue.length})`);
    this.processDownloadQueue();
  }

  /**
   * Добавить задачу транскрипции в очередь
   */
  addTranscription(taskId: string, execute: () => Promise<void>) {
    this.transcribeQueue.push({ id: taskId, type: 'transcribe', execute });
    console.log(`[Queue] 🎙️ Added transcription task: ${taskId} (queue: ${this.transcribeQueue.length})`);
    this.processTranscribeQueue();
  }

  /**
   * Добавить задачу оценки в очередь
   */
  addScoring(taskId: string, sessionId: string, execute: () => Promise<void>) {
    // Проверяем лимит авто-оценки для сессии
    const currentCount = this.scoredCountBySession.get(sessionId) || 0;
    if (currentCount >= QUEUE_CONFIG.MAX_AUTO_SCORE_PER_SESSION) {
      console.log(`[Queue] ⏭️ Skipping AI score for ${taskId} - session limit reached (${currentCount}/${QUEUE_CONFIG.MAX_AUTO_SCORE_PER_SESSION})`);
      return;
    }

    // Увеличиваем счётчик
    this.scoredCountBySession.set(sessionId, currentCount + 1);
    
    // Автоочистка сессии через 10 минут
    this.resetSessionTimeout(sessionId);

    this.scoreQueue.push({ id: taskId, type: 'score', execute });
    console.log(`[Queue] 🎯 Added scoring task: ${taskId} (queue: ${this.scoreQueue.length}, session ${sessionId}: ${currentCount + 1}/${QUEUE_CONFIG.MAX_AUTO_SCORE_PER_SESSION})`);
    this.processScoreQueue();
  }

  /**
   * Сбросить/обновить таймаут очистки сессии
   */
  private resetSessionTimeout(sessionId: string) {
    const existing = this.sessionTimeouts.get(sessionId);
    if (existing) clearTimeout(existing);
    
    const timeout = setTimeout(() => {
      this.scoredCountBySession.delete(sessionId);
      this.sessionTimeouts.delete(sessionId);
      console.log(`[Queue] 🧹 Cleared session counter: ${sessionId}`);
    }, 10 * 60 * 1000); // 10 минут
    
    this.sessionTimeouts.set(sessionId, timeout);
  }

  /**
   * Получить статистику очереди
   */
  getStats() {
    return {
      downloads: { queued: this.downloadQueue.length, active: this.activeDownloads },
      transcriptions: { queued: this.transcribeQueue.length, active: this.activeTranscriptions },
      scoring: { queued: this.scoreQueue.length, active: this.activeScoring },
    };
  }

  private async processDownloadQueue() {
    if (this.activeDownloads >= QUEUE_CONFIG.MAX_CONCURRENT_DOWNLOADS) return;
    if (this.downloadQueue.length === 0) return;

    const task = this.downloadQueue.shift()!;
    this.activeDownloads++;

    try {
      await task.execute();
    } catch (error: any) {
      console.error(`[Queue] Download task failed: ${task.id}`, error.message);
    } finally {
      this.activeDownloads--;
      // Задержка перед следующей задачей
      await this.delay(QUEUE_CONFIG.QUEUE_DELAY_MS);
      this.processDownloadQueue();
    }
  }

  private async processTranscribeQueue() {
    if (this.activeTranscriptions >= QUEUE_CONFIG.MAX_CONCURRENT_TRANSCRIPTIONS) return;
    if (this.transcribeQueue.length === 0) return;

    const task = this.transcribeQueue.shift()!;
    this.activeTranscriptions++;

    try {
      await task.execute();
    } catch (error: any) {
      console.error(`[Queue] Transcription task failed: ${task.id}`, error.message);
    } finally {
      this.activeTranscriptions--;
      // Задержка перед следующей задачей
      await this.delay(QUEUE_CONFIG.QUEUE_DELAY_MS);
      this.processTranscribeQueue();
    }
  }

  private async processScoreQueue() {
    if (this.activeScoring >= QUEUE_CONFIG.MAX_CONCURRENT_SCORING) return;
    if (this.scoreQueue.length === 0) return;

    const task = this.scoreQueue.shift()!;
    this.activeScoring++;

    try {
      await task.execute();
    } catch (error: any) {
      console.error(`[Queue] Scoring task failed: ${task.id}`, error.message);
    } finally {
      this.activeScoring--;
      // Задержка перед следующей задачей (AI calls are expensive)
      await this.delay(QUEUE_CONFIG.QUEUE_DELAY_MS * 2);
      this.processScoreQueue();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const processingQueue = new ProcessingQueue();

/**
 * Получить экземпляр очереди обработки (для статистики)
 */
export function getProcessingQueue() {
  return processingQueue;
}

/**
 * Background download helper for Instagram media
 * Downloads video + thumbnail without blocking the response
 * Uses processing queue to limit concurrency
 */
export async function downloadInstagramMediaBackground(
  itemId: string,
  videoUrl: string,
  thumbnailUrl: string | null,
  userId?: string,
  sessionId?: string // Для отслеживания лимита оценки
): Promise<void> {
  // Добавляем в очередь вместо немедленного выполнения
  processingQueue.addDownload(itemId, async () => {
    try {
      // Update status to 'downloading'
      await storage.updateInstagramItemDownloadStatus(itemId, 'downloading');

      // Download media (with retry logic built-in)
      const result = await downloadInstagramMedia(videoUrl, thumbnailUrl, itemId);

      // Check results
      if (result.video.success) {
        await storage.updateInstagramItemDownloadStatus(
          itemId,
          'completed',
          result.video.localPath,
          result.thumbnail?.localPath,
          undefined
        );
        console.log(`[Instagram] ✅ Downloaded media for item: ${itemId}`);

        // Auto-start transcription after successful download (via queue)
        if (userId && result.video.localPath) {
          console.log(`[Instagram] 🎙️ Queuing transcription for item: ${itemId}`);
          transcribeInstagramItemBackground(itemId, result.video.localPath, userId, sessionId);
        }
      } else {
        await storage.updateInstagramItemDownloadStatus(
          itemId,
          'failed',
          undefined,
          undefined,
          result.video.error
        );
        console.error(`[Instagram] ❌ Failed to download video for item: ${itemId} - ${result.video.error}`);
      }
    } catch (error: any) {
      console.error(`[Instagram] ❌ Background download error for item ${itemId}:`, error.message);
      await storage.updateInstagramItemDownloadStatus(
        itemId,
        'failed',
        undefined,
        undefined,
        error.message
      ).catch(err => console.error('Failed to update download status:', err));
    }
  });
}

/**
 * Background transcription helper for Instagram Reels
 * Transcribes downloaded video without blocking the response
 * Uses processing queue to limit concurrency
 */
export async function transcribeInstagramItemBackground(
  itemId: string,
  localVideoPath: string,
  userId: string,
  sessionId?: string // Для отслеживания лимита оценки
): Promise<void> {
  // Добавляем в очередь транскрипции
  processingQueue.addTranscription(itemId, async () => {
    try {
      console.log(`[Transcription] Starting background transcription for item: ${itemId}`);

      // Update status to 'processing' before starting transcription
      await storage.updateInstagramItemTranscription(itemId, 'processing');

      // Transcribe the video using OpenAI Whisper
      const result = await transcribeInstagramVideo(localVideoPath, userId);

      // Check results
      if (result.success) {
        await storage.updateInstagramItemTranscription(
          itemId,
          'completed',
          result.text,
          result.language,
          undefined
        );
        console.log(`[Transcription] ✅ Transcribed item: ${itemId} (${result.text?.length || 0} chars, language: ${result.language})`);

        // Auto-start AI scoring after successful transcription (via queue with limit)
        if (result.text) {
          console.log(`[AI Score] 🎯 Queuing AI analysis for item: ${itemId}`);
          scoreInstagramItemBackground(itemId, userId, sessionId);
        }
      } else {
        await storage.updateInstagramItemTranscription(
          itemId,
          'failed',
          undefined,
          undefined,
          result.error
        );
        console.error(`[Transcription] ❌ Failed to transcribe item: ${itemId} - ${result.error}`);
      }
    } catch (error: any) {
      console.error(`[Transcription] ❌ Background transcription error for item ${itemId}:`, error.message);
      await storage.updateInstagramItemTranscription(
        itemId,
        'failed',
        undefined,
        undefined,
        error.message
      ).catch(err => console.error('Failed to update transcription status:', err));
    }
  });
}

/**
 * Background AI scoring helper for Instagram Reels
 * Scores transcribed Reels without blocking the response
 * Uses processing queue with session-based limits to save API costs
 */
export async function scoreInstagramItemBackground(
  itemId: string,
  userId: string,
  sessionId?: string // Для ограничения количества оценок за сессию
): Promise<void> {
  // Используем sourceId как sessionId по умолчанию
  const effectiveSessionId = sessionId || userId;
  
  // Добавляем в очередь с проверкой лимита
  processingQueue.addScoring(itemId, effectiveSessionId, async () => {
    try {
      console.log(`[AI Score] Starting AI analysis for item: ${itemId}`);

      // Get the item with transcription
      const items = await storage.getInstagramItems(userId);
      const item = items.find(i => i.id === itemId);

      if (!item) {
        console.error(`[AI Score] ❌ Item not found: ${itemId}`);
        return;
      }

      if (!item.transcriptionText) {
        console.error(`[AI Score] ❌ No transcription available for item: ${itemId}`);
        return;
      }

      // Get Anthropic API key
      const apiKeyRecord = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKeyRecord) {
        console.error(`[AI Score] ❌ Anthropic API key not found for user`);
        return;
      }

      const apiKey = apiKeyRecord.decryptedKey; // Decrypted value from storage

      // Score the Reel
      const result = await scoreInstagramReel(
        apiKey,
        item.transcriptionText,
        item.caption,
        {
          likes: item.likesCount,
          comments: item.commentsCount,
          views: item.videoViewCount,
        }
      );

      // Update item with AI scores
      await storage.updateInstagramItemAiScore(
        itemId,
        result.score,
        result.comment,
        result.freshnessScore,
        result.viralityScore,
        result.qualityScore
      );

      console.log(`[AI Score] ✅ Scored item: ${itemId} (overall: ${result.score}, freshness: ${result.freshnessScore}, virality: ${result.viralityScore}, quality: ${result.qualityScore})`);
    } catch (error: any) {
      console.error(`[AI Score] ❌ Background scoring error for item ${itemId}:`, error.message);
    }
  });
}
