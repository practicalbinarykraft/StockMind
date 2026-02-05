/**
 * Generation Service
 * Сервис для работы с API генерации сценариев
 */

export interface GenerationStats {
  parsed: number;
  analyzed: number;
  scriptsWritten: number;
  inReview: number;
  isRunning: boolean;
}

export interface SSEEvent {
  event: string;
  data: any;
}

export const generationService = {
  /**
   * Получить статистику генерации
   */
  async getStats(): Promise<GenerationStats> {
    const res = await fetch('/api/generation/stats', {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Ошибка получения статистики');
    }
    return res.json();
  },

  /**
   * Запустить генерацию сценариев
   */
  async start(newsIds?: string[], limit?: number): Promise<{ success: boolean; newsCount: number }> {
    const res = await fetch('/api/generation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newsIds, limit }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || error.error || 'Ошибка запуска генерации');
    }
    return res.json();
  },

  /**
   * Остановить генерацию
   */
  async stop(): Promise<{ success: boolean }> {
    const res = await fetch('/api/generation/stop', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || error.error || 'Ошибка остановки генерации');
    }
    return res.json();
  },

  /**
   * Запустить генерацию для одной новости
   */
  async startSingle(newsId: string): Promise<{ success: boolean; newsId: string }> {
    const res = await fetch('/api/generation/start-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newsId }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || error.error || 'Ошибка запуска генерации');
    }
    return res.json();
  },

  /**
   * Получить новости для генерации
   */
  async getNews(limit = 20): Promise<{ items: any[]; total: number }> {
    const res = await fetch(`/api/generation/news?limit=${limit}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Ошибка получения новостей');
    }
    return res.json();
  },

  /**
   * Подписаться на SSE стрим генерации
   */
  subscribe(
    onEvent: (event: SSEEvent) => void,
    onError?: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource('/api/generation/stream', {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (e) {
        console.error('Ошибка парсинга SSE события:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE ошибка:', error);
      if (onError) {
        onError(new Error('SSE connection error'));
      }
    };

    // Возвращаем функцию для отключения
    return () => {
      eventSource.close();
    };
  },
};
