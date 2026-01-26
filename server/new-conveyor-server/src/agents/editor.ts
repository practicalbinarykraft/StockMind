import { BaseAgent } from './base-agent';
import { AISettings } from '../db/schema';
import { ScriptwriterOutput } from './scriptwriter';

// Типы для агента-редактора
export interface EditorInput {
  script: ScriptwriterOutput;
  newsTitle: string;
  newsContent: string;
  settings: AISettings;
  onThinking?: (content: string) => void;
}

export interface EditorOutput {
  overallScore: number; // 1-10
  overallComment: string;
  verdict: 'needs_revision' | 'approved' | 'rejected';
  sceneComments: SceneComment[];
}

export interface SceneComment {
  sceneNumber: number;
  comments: Comment[];
}

export interface Comment {
  type: 'positive' | 'negative' | 'suggestion' | 'info';
  text: string;
}

/**
 * Агент-редактор
 * Оценивает сценарии и дает конструктивную критику
 */
export class EditorAgent extends BaseAgent {
  constructor() {
    super('Editor');
    this.maxTokens = 2048;
  }

  /**
   * Основной метод обработки - оценка сценария
   */
  async process(input: EditorInput): Promise<EditorOutput> {
    this.log(`Оценка сценария для новости: ${input.newsTitle}`);

    const systemPrompt = this.buildSystemPrompt(input.settings);
    const userPrompt = this.buildUserPrompt(input);

    const response = await this.callLLMInternal(
      systemPrompt,
      userPrompt,
      input.onThinking
    );

    const result = this.parseJSON<EditorOutput>(response);

    // Валидация результата
    this.validateOutput(result);

    this.log(`Сценарий оценен: ${result.overallScore}/10, вердикт: ${result.verdict}`);

    return result;
  }

  /**
   * Построение системного промпта
   * Включает базовый промпт и кастомный промпт из настроек
   */
  private buildSystemPrompt(settings: AISettings): string {
    const basePrompt = `Ты - строгий редактор вирусного контента. Твоя задача - оценить сценарий и дать конструктивную критику.

ЗАДАЧА:
Проанализируй сценарий и дай оценку по шкале 1-10.

ФОРМАТ ВЫВОДА (СТРОГО JSON):
{
  "overallScore": 8,
  "overallComment": "Общий комментарий о сценарии",
  "verdict": "approved",
  "sceneComments": [
    {
      "sceneNumber": 1,
      "comments": [
        {
          "type": "positive",
          "text": "Конкретный комментарий"
        }
      ]
    }
  ]
}

КРИТЕРИИ ОЦЕНКИ:
1. Hook (0-2 балла) - захватывает ли первая сцена?
2. Структура (0-2 балла) - логичное развитие?
3. Факты (0-2 балла) - соответствуют ли оригиналу?
4. Эмоции (0-2 балла) - вызывает ли отклик?
5. CTA (0-2 балла) - есть ли призыв к действию?

VERDICT:
- "approved" (8-10): Сценарий готов к производству
- "needs_revision" (5-7): Нужны доработки
- "rejected" (1-4): Полностью переписать

ТИПЫ КОММЕНТАРИЕВ:
- positive: что хорошо, не менять
- negative: что плохо, обязательно исправить
- suggestion: предложение по улучшению
- info: информация для размышления`;

    // Добавляем кастомный промпт из настроек если есть
    let customPrompt = '';
    if (settings.editorPrompt) {
      customPrompt = `\n\nДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ:\n${settings.editorPrompt}`;
    }

    return basePrompt + customPrompt;
  }

  /**
   * Построение пользовательского промпта
   * Включает сценарий и оригинал новости для проверки фактов
   */
  private buildUserPrompt(input: EditorInput): string {
    // Форматируем сценарий для промпта
    let scriptText = 'СЦЕНАРИЙ ДЛЯ ПРОВЕРКИ:\n\n';
    
    input.script.scenes.forEach((scene) => {
      scriptText += `Сцена ${scene.number} (${scene.duration} сек):\n`;
      scriptText += `Текст: ${scene.text}\n`;
      scriptText += `Визуал: ${scene.visual}\n\n`;
    });
    
    scriptText += `Общая длительность: ${input.script.totalDuration} секунд\n`;

    const prompt = `ОРИГИНАЛ НОВОСТИ (для проверки фактов):
Заголовок: ${input.newsTitle}
Содержание: ${input.newsContent || 'Нет содержания'}

${scriptText}

Проанализируй сценарий и дай оценку.`;

    return prompt;
  }

  /**
   * Валидация выходных данных
   */
  private validateOutput(output: EditorOutput): void {
    // Валидация overallScore
    if (typeof output.overallScore !== 'number' || output.overallScore < 1 || output.overallScore > 10) {
      throw new Error('overallScore должен быть числом от 1 до 10');
    }

    // Валидация overallComment
    if (!output.overallComment || typeof output.overallComment !== 'string') {
      throw new Error('overallComment должен быть непустой строкой');
    }

    // Валидация verdict
    const validVerdicts = ['needs_revision', 'approved', 'rejected'];
    if (!output.verdict || !validVerdicts.includes(output.verdict)) {
      throw new Error(`verdict должен быть одним из: ${validVerdicts.join(', ')}`);
    }

    // Проверка соответствия verdict и overallScore
    if (output.overallScore >= 8 && output.verdict !== 'approved') {
      this.log(`Предупреждение: overallScore ${output.overallScore} не соответствует verdict ${output.verdict}`);
    } else if (output.overallScore >= 5 && output.overallScore < 8 && output.verdict !== 'needs_revision') {
      this.log(`Предупреждение: overallScore ${output.overallScore} не соответствует verdict ${output.verdict}`);
    } else if (output.overallScore < 5 && output.verdict !== 'rejected') {
      this.log(`Предупреждение: overallScore ${output.overallScore} не соответствует verdict ${output.verdict}`);
    }

    // Валидация sceneComments
    if (!output.sceneComments || !Array.isArray(output.sceneComments)) {
      throw new Error('sceneComments должен быть массивом');
    }

    // Валидация каждого комментария к сцене
    output.sceneComments.forEach((sceneComment, index) => {
      if (!sceneComment.sceneNumber || typeof sceneComment.sceneNumber !== 'number') {
        throw new Error(`sceneComments[${index}]: отсутствует или некорректно поле sceneNumber`);
      }

      if (!sceneComment.comments || !Array.isArray(sceneComment.comments)) {
        throw new Error(`sceneComments[${index}]: comments должен быть массивом`);
      }

      // Валидация каждого комментария
      sceneComment.comments.forEach((comment, commentIndex) => {
        const validTypes = ['positive', 'negative', 'suggestion', 'info'];
        if (!comment.type || !validTypes.includes(comment.type)) {
          throw new Error(`sceneComments[${index}].comments[${commentIndex}]: type должен быть одним из: ${validTypes.join(', ')}`);
        }

        if (!comment.text || typeof comment.text !== 'string') {
          throw new Error(`sceneComments[${index}].comments[${commentIndex}]: text должен быть непустой строкой`);
        }
      });
    });
  }
}
