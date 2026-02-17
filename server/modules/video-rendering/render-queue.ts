import { logger } from "../../lib/logger";

/**
 * Простая очередь рендеринга в памяти
 * Для текущей нагрузки (10 пользователей/день) достаточно флага блокировки
 */
class RenderQueue {
  private queue: string[] = [];
  private isProcessing = false;
  private processingCallback: ((jobId: string) => Promise<void>) | null = null;

  /**
   * Установить callback функцию для обработки задач
   */
  setProcessingCallback(callback: (jobId: string) => Promise<void>): void {
    this.processingCallback = callback;
  }

  /**
   * Добавить задачу в очередь
   * @returns позиция в очереди (1-based)
   */
  enqueue(jobId: string): number {
    this.queue.push(jobId);
    logger.info(`Job ${jobId} added to queue. Position: ${this.queue.length}`);
    
    // Попытаться начать обработку, если очередь свободна
    this.processNext();
    
    return this.queue.length;
  }

  /**
   * Извлечь следующую задачу из очереди
   */
  dequeue(): string | undefined {
    const jobId = this.queue.shift();
    if (jobId) {
      logger.info(`Job ${jobId} dequeued. Remaining in queue: ${this.queue.length}`);
    }
    return jobId;
  }

  /**
   * Обработать следующую задачу в очереди
   */
  async processNext(): Promise<void> {
    // Если уже идет обработка или очередь пуста - выходим
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    if (!this.processingCallback) {
      logger.error("Processing callback is not set");
      return;
    }

    this.isProcessing = true;
    const jobId = this.dequeue();

    if (jobId) {
      try {
        logger.info(`Starting processing job ${jobId}`);
        await this.processingCallback(jobId);
        logger.info(`Job ${jobId} processed successfully`);
      } catch (error) {
        logger.error(`Error processing job ${jobId}:`, error);
      }
    }

    this.isProcessing = false;

    // Обработать следующую задачу, если есть
    if (this.queue.length > 0) {
      // Небольшая задержка перед следующей задачей
      setTimeout(() => this.processNext(), 1000);
    }
  }

  /**
   * Получить позицию задачи в очереди
   * @returns позиция (1-based) или 0 если не найдена
   */
  getPosition(jobId: string): number {
    const index = this.queue.indexOf(jobId);
    return index !== -1 ? index + 1 : 0;
  }

  /**
   * Отменить задачу в очереди
   * @returns true если задача была отменена
   */
  cancel(jobId: string): boolean {
    const index = this.queue.indexOf(jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      logger.info(`Job ${jobId} cancelled. Remaining in queue: ${this.queue.length}`);
      return true;
    }
    return false;
  }

  /**
   * Проверить, идет ли сейчас обработка
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Получить текущую длину очереди
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Получить все ID задач в очереди
   */
  getQueuedJobs(): string[] {
    return [...this.queue];
  }
}

// Singleton экземпляр очереди
export const renderQueue = new RenderQueue();
