import { Response } from 'express';

/**
 * Менеджер Server-Sent Events (SSE)
 * Управляет подключениями клиентов для real-time обновлений процесса генерации
 */
class SSEManager {
  private connections: Map<string, Response[]> = new Map();

  /**
   * Добавить клиента для получения SSE событий
   * @param scriptId - ID сценария
   * @param res - Express Response объект
   */
  addClient(scriptId: string, res: Response): void {
    // Установить headers для SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Отключить буферизацию в nginx
    
    // Отправить начальный keep-alive
    res.write(': connected\n\n');
    res.flushHeaders();

    // Сохранить connection
    if (!this.connections.has(scriptId)) {
      this.connections.set(scriptId, []);
    }
    this.connections.get(scriptId)!.push(res);

    // При закрытии соединения - удалить клиента
    res.on('close', () => {
      this.removeClient(scriptId, res);
    });

    // Обработка ошибок соединения
    res.on('error', (error) => {
      console.error(`[SSE Manager] Ошибка соединения для scriptId ${scriptId}:`, error);
      this.removeClient(scriptId, res);
    });

    console.log(`[SSE Manager] Клиент подключен для scriptId: ${scriptId}, всего подключений: ${this.connections.get(scriptId)?.length || 0}`);
  }

  /**
   * Удалить клиента из списка подключений
   * @param scriptId - ID сценария
   * @param res - Express Response объект
   */
  removeClient(scriptId: string, res: Response): void {
    const clients = this.connections.get(scriptId);
    if (clients) {
      const index = clients.indexOf(res);
      if (index > -1) {
        clients.splice(index, 1);
        console.log(`[SSE Manager] Клиент отключен для scriptId: ${scriptId}, осталось подключений: ${clients.length}`);
        
        // Если клиентов больше нет - удалить запись
        if (clients.length === 0) {
          this.connections.delete(scriptId);
          console.log(`[SSE Manager] Все клиенты отключены для scriptId: ${scriptId}`);
        }
      }
    }
  }

  /**
   * Отправить событие всем клиентам для конкретного scriptId
   * @param scriptId - ID сценария
   * @param event - Название события
   * @param data - Данные события
   */
  emit(scriptId: string, event: string, data: any): void {
    const clients = this.connections.get(scriptId);
    if (clients && clients.length > 0) {
      const message = `data: ${JSON.stringify({ event, data })}\n\n`;
      
      // Отправляем сообщение всем подключенным клиентам
      const activeClients: Response[] = [];
      clients.forEach((client) => {
        try {
          client.write(message);
          activeClients.push(client);
        } catch (error) {
          console.error(`[SSE Manager] Ошибка отправки сообщения клиенту:`, error);
          // Клиент будет удален при следующем событии close
        }
      });

      // Обновляем список активных клиентов
      if (activeClients.length !== clients.length) {
        this.connections.set(scriptId, activeClients);
      }

      console.log(`[SSE Manager] Событие "${event}" отправлено для scriptId: ${scriptId}, клиентов: ${activeClients.length}`);
    } else {
      console.log(`[SSE Manager] Нет подключенных клиентов для scriptId: ${scriptId}`);
    }
  }

  /**
   * Закрыть все соединения для конкретного scriptId
   * @param scriptId - ID сценария
   */
  close(scriptId: string): void {
    const clients = this.connections.get(scriptId);
    if (clients) {
      clients.forEach((client) => {
        try {
          client.write(`data: ${JSON.stringify({ event: 'closed', data: { message: 'Connection closed' } })}\n\n`);
          client.end();
        } catch (error) {
          console.error(`[SSE Manager] Ошибка закрытия соединения:`, error);
        }
      });
      this.connections.delete(scriptId);
      console.log(`[SSE Manager] Все соединения закрыты для scriptId: ${scriptId}`);
    }
  }

  /**
   * Получить количество подключенных клиентов для scriptId
   * @param scriptId - ID сценария
   * @returns Количество подключенных клиентов
   */
  getClientCount(scriptId: string): number {
    return this.connections.get(scriptId)?.length || 0;
  }

  /**
   * Проверить есть ли подключенные клиенты для scriptId
   * @param scriptId - ID сценария
   * @returns true если есть подключенные клиенты
   */
  hasClients(scriptId: string): boolean {
    return this.getClientCount(scriptId) > 0;
  }
}

// Экспортируем singleton экземпляр
export const sseManager = new SSEManager();
