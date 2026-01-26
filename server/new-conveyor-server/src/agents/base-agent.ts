import { callLLM, LLMProvider } from '../lib/llm-provider';

/**
 * Базовый класс для AI агентов
 * Предоставляет общую функциональность для работы с LLM API
 * Поддерживает Anthropic Claude и DeepSeek
 */
export abstract class BaseAgent {
  protected name: string;
  protected provider: LLMProvider = 'anthropic';
  protected maxTokens: number = 2048;

  constructor(name: string, provider: LLMProvider = 'anthropic') {
    this.name = name;
    this.provider = provider;
  }

  /**
   * Установить провайдера LLM
   */
  setProvider(provider: LLMProvider): void {
    this.provider = provider;
    this.log(`Провайдер изменён на: ${provider}`);
  }

  /**
   * Вызов LLM API с поддержкой streaming и thinking events
   * @param systemPrompt - Системный промпт
   * @param userPrompt - Пользовательский промпт
   * @param onThinking - Callback для получения thinking events (опционально)
   * @returns Полный ответ от LLM
   */
  protected async callLLMInternal(
    systemPrompt: string,
    userPrompt: string,
    onThinking?: (content: string) => void
  ): Promise<string> {
    try {
      this.log(`Вызов ${this.provider.toUpperCase()} API...`);

      const response = await callLLM(
        this.provider,
        systemPrompt,
        userPrompt,
        {
          onThinking: onThinking ? (content) => {
            onThinking(content);
          } : undefined,
        },
        this.maxTokens
      );

      this.log(`Ответ получен (${response.content.length} символов)`);

      if (!response.content) {
        throw new Error(`${this.provider} вернул пустой ответ`);
      }

      return response.content;
    } catch (error) {
      this.log(`Ошибка при вызове ${this.provider} API: ${error}`, error);
      throw error;
    }
  }

  /**
   * Парсинг JSON из ответа с обработкой markdown code blocks
   * @param response - Ответ от Claude
   * @returns Распарсенный объект типа T
   */
  protected parseJSON<T>(response: string): T {
    try {
      let jsonString = response.trim();

      // Убираем markdown code blocks если есть
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Парсим JSON
      const parsed = JSON.parse(jsonString);
      return parsed as T;
    } catch (error) {
      this.log(`Ошибка парсинга JSON: ${error}`, { response });
      throw new Error(`Не удалось распарсить JSON из ответа: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Логирование с префиксом имени агента
   * @param message - Сообщение для логирования
   * @param data - Дополнительные данные (опционально)
   */
  protected log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] [${this.name}] ${message}`, data);
    } else {
      console.log(`[${timestamp}] [${this.name}] ${message}`);
    }
  }

  /**
   * Абстрактный метод - каждый агент реализует свой процесс обработки
   * @param input - Входные данные для обработки
   * @returns Результат обработки
   */
  abstract process(input: any): Promise<any>;
}
