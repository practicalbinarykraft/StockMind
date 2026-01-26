import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие API ключа
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is required in .env file');
}

// Инициализация клиента Anthropic
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Вызов Claude API
 * @param systemPrompt - Системный промпт
 * @param userPrompt - Пользовательский промпт
 * @param maxTokens - Максимальное количество токенов в ответе (по умолчанию 1024)
 * @returns Ответ от Claude
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024
): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Извлекаем текст из ответа
    const textContent = message.content.find(
      (block) => block.type === 'text'
    ) as Anthropic.TextBlock | undefined;

    if (!textContent) {
      throw new Error('Claude вернул пустой ответ');
    }

    return textContent.text;
  } catch (error) {
    console.error('[Anthropic] Ошибка при вызове Claude API:', error);
    throw error;
  }
}
