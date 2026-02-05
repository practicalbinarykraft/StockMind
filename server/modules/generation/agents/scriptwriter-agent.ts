/**
 * Scriptwriter Agent
 * Генерирует сценарии для коротких вирусных видео на основе новостей
 */
import { BaseAgent } from './base-agent';

interface StylePreferences {
  formality: 'formal' | 'conversational' | 'casual';
  tone: 'serious' | 'engaging' | 'funny' | 'motivational';
  language: 'ru' | 'en';
}

interface DurationRange {
  min: number;
  max: number;
}

export interface ScriptwriterInput {
  newsTitle: string;
  newsContent: string;
  previousReview?: {
    overallComment: string;
    sceneComments: Array<{
      sceneNumber: number;
      comments: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
  version: number;
  customPrompt?: string;
  examples?: Array<{ content: string }>;
  // Новые настройки стиля
  stylePreferences?: StylePreferences;
  durationRange?: DurationRange;
  onThinking?: (content: string) => void;
}

export interface ScriptScene {
  number: number;
  text: string;
  visual: string;
  duration: number;
}

export interface ScriptwriterOutput {
  scenes: ScriptScene[];
  totalDuration: number;
}

export class ScriptwriterAgent extends BaseAgent {
  constructor() {
    super({ name: 'Scriptwriter', maxTokens: 3072 });
  }

  /**
   * Генерация сценария
   */
  async process(input: ScriptwriterInput): Promise<ScriptwriterOutput> {
    this.log(`Генерация сценария версии ${input.version} для: ${input.newsTitle}`);

    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    const result = await this.callLLM<ScriptwriterOutput>(
      systemPrompt,
      userPrompt,
      input.onThinking
    );

    // Валидация результата
    this.validateOutput(result);

    this.log(`Сценарий сгенерирован: ${result.scenes.length} сцен, ${result.totalDuration} сек`);

    return result;
  }

  /**
   * Построение системного промпта
   */
  private buildSystemPrompt(input: ScriptwriterInput): string {
    // Настройки длительности
    const minDuration = input.durationRange?.min || 30;
    const maxDuration = input.durationRange?.max || 90;

    // Настройки стиля
    const formality = input.stylePreferences?.formality || 'conversational';
    const tone = input.stylePreferences?.tone || 'engaging';
    const language = input.stylePreferences?.language || 'ru';

    // Определяем стиль на основе формальности
    const formalityDescriptions: Record<string, string> = {
      formal: 'формальный, профессиональный, деловой',
      conversational: 'разговорный, как будто рассказываешь другу',
      casual: 'неформальный, расслабленный, молодёжный сленг допустим',
    };

    // Определяем тон
    const toneDescriptions: Record<string, string> = {
      serious: 'серьёзный, информативный, без шуток',
      engaging: 'вовлекающий, интересный, с эмоциональными триггерами',
      funny: 'юмористический, с шутками и иронией',
      motivational: 'мотивирующий, вдохновляющий, энергичный',
    };

    const languageInstruction = language === 'en' 
      ? 'Write the script in ENGLISH.'
      : 'Напиши сценарий на РУССКОМ языке.';

    const basePrompt = `Ты - профессиональный сценарист коротких вирусных видео для социальных сетей.

ЗАДАЧА:
Напиши сценарий для короткого видео (${minDuration}-${maxDuration} секунд) на основе новости.
${languageInstruction}

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
  "totalDuration": ${Math.round((minDuration + maxDuration) / 2)}
}

ТРЕБОВАНИЯ К СЦЕНАРИЮ:
1. Hook (первые 3 секунды) - должен захватить внимание
2. Контекст - кратко объясни о чём речь
3. Основная часть - раскрой тему с фактами
4. Twist/Инсайт - неожиданный поворот или интересный факт
5. CTA - призыв к действию (подписка, комментарий)
6. Общая длительность должна быть от ${minDuration} до ${maxDuration} секунд

СТИЛЬ И ТОН:
- ${formalityDescriptions[formality] || formalityDescriptions.conversational}
- ${toneDescriptions[tone] || toneDescriptions.engaging}
- Короткие предложения (макс 15 слов)
- Конкретные цифры и факты`;

    // Добавляем кастомный промпт если есть
    let customPrompt = '';
    if (input.customPrompt) {
      customPrompt = `\n\nДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ:\n${input.customPrompt}`;
    }

    // Добавляем примеры если есть
    let examplesSection = '';
    if (input.examples && input.examples.length > 0) {
      examplesSection = '\n\nПРИМЕРЫ ХОРОШИХ СЦЕНАРИЕВ:\n';
      input.examples.forEach((example, index) => {
        if (example.content) {
          examplesSection += `\nПример ${index + 1}:\n${example.content}\n`;
        }
      });
    }

    return basePrompt + customPrompt + examplesSection;
  }

  /**
   * Построение пользовательского промпта
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

      // Добавляем комментарии по сценам
      if (input.previousReview.sceneComments && Array.isArray(input.previousReview.sceneComments)) {
        input.previousReview.sceneComments.forEach((sceneComment) => {
          if (sceneComment.sceneNumber && sceneComment.comments) {
            prompt += `\n\nСцена ${sceneComment.sceneNumber}:`;
            sceneComment.comments.forEach((comment) => {
              if (comment.type && comment.text) {
                const typeLabel: Record<string, string> = {
                  positive: '✅ Хорошо',
                  negative: '❌ Плохо - исправить',
                  suggestion: '💡 Предложение',
                  info: 'ℹ️ Информация'
                };
                prompt += `\n${typeLabel[comment.type] || comment.type}: ${comment.text}`;
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
  }
}

export const scriptwriterAgent = new ScriptwriterAgent();
