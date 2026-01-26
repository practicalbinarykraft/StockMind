/**
 * Base Agent
 * Базовый класс для AI агентов генерации сценариев
 */
import Anthropic from '@anthropic-ai/sdk';

export type LLMProvider = 'anthropic' | 'deepseek';

export interface AgentConfig {
  name: string;
  maxTokens?: number;
}

export abstract class BaseAgent {
  protected name: string;
  protected maxTokens: number;
  protected apiKey: string = '';

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.maxTokens = config.maxTokens || 2048;
  }

  /**
   * Установить API ключ
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Вызов LLM API с streaming и thinking
   */
  protected async callLLM<T>(
    systemPrompt: string,
    userPrompt: string,
    onThinking?: (content: string) => void
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('API key not set for agent');
    }

    this.log(`Вызов Claude API...`);

    try {
      const client = new Anthropic({ apiKey: this.apiKey });

      const stream = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: this.maxTokens,
        stream: true,
        thinking: { type: 'enabled', budget_tokens: 1024 },
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const delta = chunk.delta as any;

          // Handle thinking events
          if ('thinking' in delta && typeof delta.thinking === 'string') {
            if (onThinking) {
              onThinking(delta.thinking);
            }
          }

          // Handle text content
          if ('text' in delta && typeof delta.text === 'string') {
            fullResponse += delta.text;
          }
        }
      }

      this.log(`Ответ получен (${fullResponse.length} символов)`);
      
      // Parse JSON from response
      return this.parseJSON<T>(fullResponse);
    } catch (error: any) {
      this.log(`Ошибка: ${error.message}`);
      throw error;
    }
  }

  /**
   * Парсинг JSON из ответа
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

      // Ищем JSON в тексте если он не начинается с { или [
      if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
        const match = jsonString.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (match) {
          jsonString = match[1];
        }
      }

      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.log(`Ошибка парсинга JSON`, { response: response.substring(0, 500) });
      throw new Error(`Не удалось распарсить JSON из ответа: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Логирование
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
   * Абстрактный метод обработки
   */
  abstract process(input: any): Promise<any>;
}
