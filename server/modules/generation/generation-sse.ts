/**
 * Generation SSE Manager
 * Управляет SSE соединениями для real-time обновлений генерации сценариев
 */
import { Response } from 'express';

export interface GenerationStats {
  parsed: number;
  analyzed: number;
  scriptsWritten: number;
  inReview: number;
}

class GenerationSSEManager {
  // Map: userId -> Response[] (для broadcast всем клиентам пользователя)
  private userConnections: Map<string, Response[]> = new Map();
  // Map: scriptId -> Response[] (для конкретного скрипта)
  private scriptConnections: Map<string, Response[]> = new Map();
  // Map: userId -> running state
  private runningState: Map<string, boolean> = new Map();
  // Map: userId -> stats
  private statsCache: Map<string, GenerationStats> = new Map();

  /**
   * Подключить клиента для получения обновлений пользователя
   */
  addUserClient(userId: string, res: Response): void {
    // Установить headers для SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Отправить начальный keep-alive
    res.write(': connected\n\n');
    res.flushHeaders();

    // Сохранить connection
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, []);
    }
    this.userConnections.get(userId)!.push(res);

    // При закрытии соединения - удалить клиента
    res.on('close', () => {
      this.removeUserClient(userId, res);
    });

    res.on('error', (error) => {
      console.error(`[Generation SSE] Ошибка соединения для userId ${userId}:`, error);
      this.removeUserClient(userId, res);
    });

    console.log(`[Generation SSE] Клиент подключен для userId: ${userId}, всего: ${this.userConnections.get(userId)?.length || 0}`);

    // Отправить текущее состояние сразу
    const isRunning = this.runningState.get(userId) || false;
    const stats = this.statsCache.get(userId) || { parsed: 0, analyzed: 0, scriptsWritten: 0, inReview: 0 };
    
    this.emitToUser(userId, 'state', { isRunning, stats });
  }

  /**
   * Подключить клиента для получения обновлений конкретного скрипта
   */
  addScriptClient(scriptId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    res.write(': connected\n\n');
    res.flushHeaders();

    if (!this.scriptConnections.has(scriptId)) {
      this.scriptConnections.set(scriptId, []);
    }
    this.scriptConnections.get(scriptId)!.push(res);

    res.on('close', () => {
      this.removeScriptClient(scriptId, res);
    });

    res.on('error', () => {
      this.removeScriptClient(scriptId, res);
    });

    console.log(`[Generation SSE] Клиент подключен для scriptId: ${scriptId}`);
  }

  /**
   * Удалить клиента пользователя
   */
  private removeUserClient(userId: string, res: Response): void {
    const clients = this.userConnections.get(userId);
    if (clients) {
      const index = clients.indexOf(res);
      if (index > -1) {
        clients.splice(index, 1);
        if (clients.length === 0) {
          this.userConnections.delete(userId);
        }
      }
    }
  }

  /**
   * Удалить клиента скрипта
   */
  private removeScriptClient(scriptId: string, res: Response): void {
    const clients = this.scriptConnections.get(scriptId);
    if (clients) {
      const index = clients.indexOf(res);
      if (index > -1) {
        clients.splice(index, 1);
        if (clients.length === 0) {
          this.scriptConnections.delete(scriptId);
        }
      }
    }
  }

  /**
   * Отправить событие всем клиентам пользователя
   */
  emitToUser(userId: string, event: string, data: any): void {
    const clients = this.userConnections.get(userId);
    if (clients && clients.length > 0) {
      const message = `data: ${JSON.stringify({ event, data })}\n\n`;
      const activeClients: Response[] = [];
      
      clients.forEach((client) => {
        try {
          client.write(message);
          activeClients.push(client);
        } catch (error) {
          console.error(`[Generation SSE] Ошибка отправки:`, error);
        }
      });

      if (activeClients.length !== clients.length) {
        this.userConnections.set(userId, activeClients);
      }
    }
  }

  /**
   * Отправить событие клиентам конкретного скрипта
   */
  emitToScript(scriptId: string, event: string, data: any): void {
    const clients = this.scriptConnections.get(scriptId);
    if (clients && clients.length > 0) {
      const message = `data: ${JSON.stringify({ event, data })}\n\n`;
      const activeClients: Response[] = [];
      
      clients.forEach((client) => {
        try {
          client.write(message);
          activeClients.push(client);
        } catch (error) {
          console.error(`[Generation SSE] Ошибка отправки:`, error);
        }
      });

      if (activeClients.length !== clients.length) {
        this.scriptConnections.set(scriptId, activeClients);
      }
    }
  }

  /**
   * Закрыть все соединения для скрипта
   */
  closeScriptConnections(scriptId: string): void {
    const clients = this.scriptConnections.get(scriptId);
    if (clients) {
      clients.forEach((client) => {
        try {
          client.write(`data: ${JSON.stringify({ event: 'closed', data: {} })}\n\n`);
          client.end();
        } catch (error) {
          console.error(`[Generation SSE] Ошибка закрытия:`, error);
        }
      });
      this.scriptConnections.delete(scriptId);
    }
  }

  // === Convenience methods ===

  /**
   * Установить состояние "запущен/остановлен" для пользователя
   */
  setRunning(userId: string, isRunning: boolean): void {
    this.runningState.set(userId, isRunning);
    this.emitToUser(userId, 'running_state', { isRunning });
  }

  /**
   * Проверить, запущена ли генерация для пользователя
   */
  isRunning(userId: string): boolean {
    return this.runningState.get(userId) || false;
  }

  /**
   * Обновить статистику для пользователя
   */
  updateStats(userId: string, stats: Partial<GenerationStats>): void {
    const currentStats = this.statsCache.get(userId) || { parsed: 0, analyzed: 0, scriptsWritten: 0, inReview: 0 };
    const newStats = { ...currentStats, ...stats };
    this.statsCache.set(userId, newStats);
    this.emitToUser(userId, 'stats', newStats);
  }

  /**
   * Получить текущую статистику для пользователя
   */
  getStats(userId: string): GenerationStats {
    return this.statsCache.get(userId) || { parsed: 0, analyzed: 0, scriptsWritten: 0, inReview: 0 };
  }

  /**
   * Сбросить статистику для пользователя
   */
  resetStats(userId: string): void {
    this.statsCache.set(userId, { parsed: 0, analyzed: 0, scriptsWritten: 0, inReview: 0 });
  }

  // === Script generation events ===

  scriptwriterStarted(userId: string, scriptId: string, iteration: number): void {
    this.emitToUser(userId, 'scriptwriter:started', { scriptId, iteration });
    this.emitToScript(scriptId, 'scriptwriter:started', { iteration });
  }

  scriptwriterThinking(scriptId: string, content: string): void {
    this.emitToScript(scriptId, 'scriptwriter:thinking', { content });
  }

  scriptwriterCompleted(userId: string, scriptId: string, scenesCount: number): void {
    this.emitToUser(userId, 'scriptwriter:completed', { scriptId, scenesCount });
    this.emitToScript(scriptId, 'scriptwriter:completed', { scenesCount });
    // Не увеличиваем scriptsWritten здесь - это происходит при каждой итерации
    // scriptsWritten увеличивается только в scriptCompleted
  }

  editorStarted(userId: string, scriptId: string, iteration: number): void {
    this.emitToUser(userId, 'editor:started', { scriptId, iteration });
    this.emitToScript(scriptId, 'editor:started', { iteration });
  }

  editorThinking(scriptId: string, content: string): void {
    this.emitToScript(scriptId, 'editor:thinking', { content });
  }

  editorCompleted(userId: string, scriptId: string, score: number, verdict: string): void {
    this.emitToUser(userId, 'editor:completed', { scriptId, score, verdict });
    this.emitToScript(scriptId, 'editor:completed', { score, verdict });
    // Не обновляем счётчики здесь - это происходит при каждой итерации
    // Счётчики обновляются через refreshStats в scriptCompleted
  }

  newsAnalyzed(userId: string, newsId: string): void {
    const stats = this.getStats(userId);
    this.updateStats(userId, { analyzed: stats.analyzed + 1 });
    this.emitToUser(userId, 'news:analyzed', { newsId });
  }

  scriptCompleted(userId: string, scriptId: string, finalScore: number): void {
    this.emitToUser(userId, 'script:completed', { scriptId, finalScore });
    this.emitToScript(scriptId, 'completed', { finalScore });
    this.closeScriptConnections(scriptId);
    // Статистика обновляется через refreshStats, вызываемый из pipeline
  }

  /**
   * Обновить статистику полностью из БД (вызывается после завершения скрипта)
   */
  refreshStatsFromDB(userId: string, stats: GenerationStats): void {
    this.statsCache.set(userId, stats);
    this.emitToUser(userId, 'stats', stats);
    console.log(`[Generation SSE] Stats refreshed for userId ${userId}:`, stats);
  }

  scriptError(userId: string, scriptId: string, error: string): void {
    this.emitToUser(userId, 'script:error', { scriptId, error });
    this.emitToScript(scriptId, 'error', { message: error });
    this.closeScriptConnections(scriptId);
  }
}

// Singleton
export const generationSSE = new GenerationSSEManager();
