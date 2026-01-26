import { BaseAgent } from './base-agent';
import { AISettings, Review } from '../db/schema';

// Типы для агента-сценариста
export interface ScriptwriterInput {
  newsTitle: string;
  newsContent: string;
  settings: AISettings;
  previousReview?: Review; // Для итераций 2+
  version: number;
  onThinking?: (content: string) => void;
}

export interface ScriptwriterOutput {
  scenes: Scene[];
  totalDuration: number;
}

export interface Scene {
  number: number;
  text: string;
  visual: string;
  duration: number;
}

/**
 * Агент-сценарист
 * Генерирует сценарии для коротких вирусных видео на основе новостей
 */
export class ScriptwriterAgent extends BaseAgent {
  constructor() {
    super('Scriptwriter');
    this.maxTokens = 3072;
  }

  /**
   * Основной метод обработки - генерация сценария
   */
  async process(input: ScriptwriterInput): Promise<ScriptwriterOutput> {
    this.log(`Генерация сценария версии ${input.version} для новости: ${input.newsTitle}`);

    const systemPrompt = this.buildSystemPrompt(input.settings);
    const userPrompt = this.buildUserPrompt(input);

    const response = await this.callLLMInternal(
      systemPrompt,
      userPrompt,
      input.onThinking
    );

    const result = this.parseJSON<ScriptwriterOutput>(response);

    // Валидация результата
    this.validateOutput(result);

    this.log(`Сценарий сгенерирован: ${result.scenes.length} сцен, общая длительность: ${result.totalDuration} сек`);

    return result;
  }

  /**
   * Построение системного промпта
   * Включает базовый промпт, кастомный промпт из настроек и примеры
   */
  private buildSystemPrompt(settings: AISettings): string {
    const basePrompt = `Ты - профессиональный сценарист коротких вирусных видео для социальных сетей.

ЗАДАЧА:
Напиши сценарий для короткого видео (30-90 секунд) на основе новости.

ФОРМАТ ВЫВОДА (СТРОГО JSON):
{
  "scenes": [
    {
      "number": 1,
      "text": "Текст для озвучки этой сцены",
      "visual": "Описание визуала/картинки для этой сцены",
      "duration": 5
    }
  ],
  "totalDuration": 45
}

ТРЕБОВАНИЯ К СЦЕНАРИЮ:
1. Hook (первые 3 секунды) - должен захватить внимание
2. Контекст - кратко объясни о чём речь
3. Основная часть - раскрой тему с фактами
4. Twist/Инсайт - неожиданный поворот или интересный факт
5. CTA - призыв к действию (подписка, комментарий)

СТИЛЬ:
- Разговорный, как будто рассказываешь другу
- Короткие предложения (макс 15 слов)
- Эмоциональные триггеры
- Конкретные цифры и факты`;

    // Добавляем кастомный промпт из настроек если есть
    let customPrompt = '';
    if (settings.scriptwriterPrompt) {
      customPrompt = `\n\nДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ:\n${settings.scriptwriterPrompt}`;
    }

    // Добавляем примеры если есть
    let examplesSection = '';
    if (settings.examples && Array.isArray(settings.examples) && settings.examples.length > 0) {
      examplesSection = '\n\nПРИМЕРЫ ХОРОШИХ СЦЕНАРИЕВ:\n';
      settings.examples.forEach((example: any, index: number) => {
        if (example.content) {
          examplesSection += `\nПример ${index + 1}:\n${example.content}\n`;
        }
      });
    }

    return basePrompt + customPrompt + examplesSection;
  }

  /**
   * Построение пользовательского промпта
   * Включает новость и предыдущую рецензию (если есть)
   */
  private buildUserPrompt(input: ScriptwriterInput): string {
    let prompt = `НОВОСТЬ:
Заголовок: ${input.newsTitle}
Содержание: ${input.newsContent || 'Нет содержания'}`;

    // Если это не первая версия, добавляем информацию о предыдущей рецензии
    if (input.previousReview && input.version > 1) {
      prompt += `\n\nВАЖНО: Это версия ${input.version}. Учти замечания редактора:
${input.previousReview.overallComment || 'Нет общего комментария'}

Конкретные правки по сценам:`;

      // Добавляем комментарии по сценам если есть
      if (input.previousReview.sceneComments && Array.isArray(input.previousReview.sceneComments)) {
        input.previousReview.sceneComments.forEach((sceneComment: any) => {
          if (sceneComment.sceneNumber && sceneComment.comments) {
            prompt += `\n\nСцена ${sceneComment.sceneNumber}:`;
            sceneComment.comments.forEach((comment: any) => {
              if (comment.type && comment.text) {
                const typeLabel = {
                  positive: '✅ Хорошо',
                  negative: '❌ Плохо - исправить',
                  suggestion: '💡 Предложение',
                  info: 'ℹ️ Информация'
                }[comment.type] || comment.type;
                prompt += `\n${typeLabel}: ${comment.text}`;
              }
            });
          }
        });
      }
    }

    return prompt;
  }

  /**
   * Валидация выходных данных
   */
  private validateOutput(output: ScriptwriterOutput): void {
    if (!output.scenes || !Array.isArray(output.scenes)) {
      throw new Error('Результат должен содержать массив scenes');
    }

    if (output.scenes.length < 3 || output.scenes.length > 8) {
      this.log(`Предупреждение: необычное количество сцен: ${output.scenes.length}`);
    }

    if (!output.totalDuration || typeof output.totalDuration !== 'number') {
      throw new Error('Результат должен содержать totalDuration (число)');
    }

    // Валидация каждой сцены
    output.scenes.forEach((scene, index) => {
      if (!scene.number || typeof scene.number !== 'number') {
        throw new Error(`Сцена ${index + 1}: отсутствует или некорректно поле number`);
      }
      if (!scene.text || typeof scene.text !== 'string') {
        throw new Error(`Сцена ${index + 1}: отсутствует или некорректно поле text`);
      }
      if (!scene.visual || typeof scene.visual !== 'string') {
        throw new Error(`Сцена ${index + 1}: отсутствует или некорректно поле visual`);
      }
      if (!scene.duration || typeof scene.duration !== 'number') {
        throw new Error(`Сцена ${index + 1}: отсутствует или некорректно поле duration`);
      }
    });

    // Проверка что номера сцен идут по порядку
    const numbers = output.scenes.map(s => s.number).sort((a, b) => a - b);
    for (let i = 0; i < numbers.length; i++) {
      if (numbers[i] !== i + 1) {
        this.log(`Предупреждение: номера сцен не по порядку`);
        break;
      }
    }
  }
}
