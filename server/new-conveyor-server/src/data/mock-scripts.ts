/**
 * Мок данные для сценариев
 * Используются для демонстрации работы системы разработчикам
 */

import { NewsScript, FrontendIteration } from '../lib/transformers';

export const mockScripts: NewsScript[] = [
  {
    id: 'mock-script-1',
    newsTitle: 'Искусственный интеллект научился создавать реалистичные видео',
    newsSource: 'TechNews',
    status: 'completed',
    currentIteration: 2,
    maxIterations: 3,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    iterations: [
      {
        id: 'mock-iter-1-1',
        version: 1,
        createdAt: new Date('2024-01-15T10:01:00Z'),
        script: {
          id: 'mock-script-version-1-1',
          scenes: [
            {
              id: 'mock-scene-1-1-1',
              number: 1,
              text: 'Представь, что ты можешь создать любое видео просто описав его словами.',
              visual: 'Человек печатает на клавиатуре, на экране появляется видео',
              duration: 3,
            },
            {
              id: 'mock-scene-1-1-2',
              number: 2,
              text: 'ИИ уже умеет это делать. Новая модель от OpenAI генерирует реалистичные видео по текстовому описанию.',
              visual: 'Демонстрация генерации видео: текст превращается в движущееся изображение',
              duration: 8,
            },
            {
              id: 'mock-scene-1-1-3',
              number: 3,
              text: 'Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд.',
              visual: 'Схема работы: GPT-4 → генерация кадров → объединение в видео',
              duration: 10,
            },
            {
              id: 'mock-scene-1-1-4',
              number: 4,
              text: 'Но есть проблема: модель пока не различает правду и вымысел.',
              visual: 'Вопросительный знак, затем примеры фейковых видео',
              duration: 7,
            },
            {
              id: 'mock-scene-1-1-5',
              number: 5,
              text: 'Подписывайся, чтобы узнать больше о технологиях будущего!',
              visual: 'Кнопка подписки с анимацией',
              duration: 3,
            },
          ],
          generatedAt: new Date('2024-01-15T10:01:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-1-1',
          overallScore: 7,
          overallComment: 'Хороший сценарий, но можно улучшить хук и добавить больше конкретных цифр. Twist недостаточно сильный.',
          createdAt: new Date('2024-01-15T10:02:00Z'),
          sceneComments: [
            {
              sceneId: 'mock-scene-1-1-1',
              sceneNumber: 1,
              comments: [
                {
                  id: 'comment-1-1-1',
                  type: 'suggestion',
                  text: 'Хук можно сделать более провокационным, добавить вопрос',
                },
                {
                  id: 'comment-1-1-2',
                  type: 'positive',
                  text: 'Хорошая идея с визуалом',
                },
              ],
            },
            {
              sceneId: 'mock-scene-1-1-3',
              sceneNumber: 3,
              comments: [
                {
                  id: 'comment-1-1-3',
                  type: 'negative',
                  text: 'Нужны конкретные цифры: сколько кадров в секунду, какое разрешение',
                },
              ],
            },
            {
              sceneId: 'mock-scene-1-1-4',
              sceneNumber: 4,
              comments: [
                {
                  id: 'comment-1-1-4',
                  type: 'suggestion',
                  text: 'Twist можно усилить, добавить примеры реальных проблем',
                },
              ],
            },
          ],
        },
      },
      {
        id: 'mock-iter-1-2',
        version: 2,
        createdAt: new Date('2024-01-15T10:03:00Z'),
        script: {
          id: 'mock-script-version-1-2',
          scenes: [
            {
              id: 'mock-scene-1-2-1',
              number: 1,
              text: 'Что если я скажу, что теперь можно создать любое видео за 10 секунд?',
              visual: 'Таймер отсчитывает 10 секунд, затем появляется готовое видео',
              duration: 4,
              changes: {
                added: [],
                removed: [],
                modified: true,
              },
            },
            {
              id: 'mock-scene-1-2-2',
              number: 2,
              text: 'ИИ уже умеет это делать. Новая модель от OpenAI генерирует реалистичные видео по текстовому описанию.',
              visual: 'Демонстрация генерации видео: текст превращается в движущееся изображение',
              duration: 8,
            },
            {
              id: 'mock-scene-1-2-3',
              number: 3,
              text: 'Технология работает на основе GPT-4 и может создавать видео в разрешении 1920x1080 со скоростью 30 кадров в секунду.',
              visual: 'Схема работы: GPT-4 → генерация кадров → объединение в видео, показываются технические характеристики',
              duration: 12,
              changes: {
                added: ['visual'],
                removed: [],
                modified: true,
              },
            },
            {
              id: 'mock-scene-1-2-4',
              number: 4,
              text: 'Но есть проблема: модель пока не различает правду и вымысел. Уже зафиксированы случаи создания фейковых новостей.',
              visual: 'Вопросительный знак, затем примеры фейковых видео с предупреждением',
              duration: 9,
              changes: {
                added: [],
                removed: [],
                modified: true,
              },
            },
            {
              id: 'mock-scene-1-2-5',
              number: 5,
              text: 'Подписывайся, чтобы узнать больше о технологиях будущего!',
              visual: 'Кнопка подписки с анимацией',
              duration: 3,
            },
          ],
          generatedAt: new Date('2024-01-15T10:03:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-1-2',
          overallScore: 9,
          overallComment: 'Отличный сценарий! Хук стал сильнее, добавлены конкретные цифры, twist усилен. Готов к продакшену.',
          createdAt: new Date('2024-01-15T10:04:00Z'),
          sceneComments: [
            {
              sceneId: 'mock-scene-1-2-1',
              sceneNumber: 1,
              comments: [
                {
                  id: 'comment-1-2-1',
                  type: 'positive',
                  text: 'Отличный хук! Вопрос сразу захватывает внимание',
                },
              ],
            },
            {
              sceneId: 'mock-scene-1-2-3',
              sceneNumber: 3,
              comments: [
                {
                  id: 'comment-1-2-2',
                  type: 'positive',
                  text: 'Отлично! Добавлены конкретные технические характеристики',
                },
              ],
            },
            {
              sceneId: 'mock-scene-1-2-4',
              sceneNumber: 4,
              comments: [
                {
                  id: 'comment-1-2-3',
                  type: 'positive',
                  text: 'Twist стал намного сильнее с конкретными примерами',
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'mock-script-2',
    newsTitle: 'Учёные создали материал, который может самовосстанавливаться',
    newsSource: 'ScienceDaily',
    status: 'in_progress',
    currentIteration: 1,
    maxIterations: 3,
    createdAt: new Date('2024-01-15T11:00:00Z'),
    iterations: [
      {
        id: 'mock-iter-2-1',
        version: 1,
        createdAt: new Date('2024-01-15T11:01:00Z'),
        script: {
          id: 'mock-script-version-2-1',
          scenes: [
            {
              id: 'mock-scene-2-1-1',
              number: 1,
              text: 'Что если бы твой телефон мог сам чинить трещины на экране?',
              visual: 'Трещина на экране телефона начинает затягиваться сама',
              duration: 4,
            },
            {
              id: 'mock-scene-2-1-2',
              number: 2,
              text: 'Учёные из MIT создали материал, который может самовосстанавливаться при повреждении.',
              visual: 'Учёные в лаборатории, демонстрация материала',
              duration: 8,
            },
            {
              id: 'mock-scene-2-1-3',
              number: 3,
              text: 'Материал состоит из специальных полимеров, которые при разрыве автоматически срастаются обратно.',
              visual: 'Макросъёмка: разрыв материала и его восстановление',
              duration: 10,
            },
            {
              id: 'mock-scene-2-1-4',
              number: 4,
              text: 'Применение: от экранов смартфонов до космических кораблей.',
              visual: 'Примеры применения: телефон, автомобиль, космический корабль',
              duration: 7,
            },
            {
              id: 'mock-scene-2-1-5',
              number: 5,
              text: 'Ставь лайк, если хочешь такой телефон!',
              visual: 'Кнопка лайка с анимацией',
              duration: 3,
            },
          ],
          generatedAt: new Date('2024-01-15T11:01:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-2-1',
          overallScore: 6,
          overallComment: 'Неплохо, но нужно больше конкретики. Добавь цифры: сколько времени занимает восстановление, при какой температуре работает.',
          createdAt: new Date('2024-01-15T11:02:00Z'),
          sceneComments: [
            {
              sceneId: 'mock-scene-2-1-1',
              sceneNumber: 1,
              comments: [
                {
                  id: 'comment-2-1-1',
                  type: 'positive',
                  text: 'Хороший хук с конкретным примером',
                },
              ],
            },
            {
              sceneId: 'mock-scene-2-1-3',
              sceneNumber: 3,
              comments: [
                {
                  id: 'comment-2-1-2',
                  type: 'negative',
                  text: 'Нужны конкретные цифры: время восстановления, условия работы',
                },
                {
                  id: 'comment-2-1-3',
                  type: 'suggestion',
                  text: 'Можно добавить сравнение с обычными материалами',
                },
              ],
            },
            {
              sceneId: 'mock-scene-2-1-4',
              sceneNumber: 4,
              comments: [
                {
                  id: 'comment-2-1-4',
                  type: 'info',
                  text: 'Хорошие примеры применения',
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: 'mock-script-3',
    newsTitle: 'Новый алгоритм ИИ может предсказывать землетрясения за неделю',
    newsSource: 'GeoScience',
    status: 'human_review',
    currentIteration: 3,
    maxIterations: 3,
    createdAt: new Date('2024-01-15T12:00:00Z'),
    iterations: [
      {
        id: 'mock-iter-3-1',
        version: 1,
        createdAt: new Date('2024-01-15T12:01:00Z'),
        script: {
          id: 'mock-script-version-3-1',
          scenes: [
            {
              id: 'mock-scene-3-1-1',
              number: 1,
              text: 'Землетрясения уносят тысячи жизней каждый год.',
              visual: 'Статистика жертв землетрясений на графике',
              duration: 3,
            },
            {
              id: 'mock-scene-3-1-2',
              number: 2,
              text: 'Но теперь есть надежда: новый алгоритм ИИ может предсказывать землетрясения.',
              visual: 'Алгоритм анализирует данные, показывает предупреждение',
              duration: 8,
            },
            {
              id: 'mock-scene-3-1-3',
              number: 3,
              text: 'Система анализирует данные с сейсмографов и предсказывает землетрясения за неделю до события.',
              visual: 'Схема работы: сейсмографы → ИИ → предупреждение',
              duration: 10,
            },
            {
              id: 'mock-scene-3-1-4',
              number: 4,
              text: 'Точность предсказаний пока составляет 70%, но это уже прорыв.',
              visual: 'График точности предсказаний',
              duration: 7,
            },
            {
              id: 'mock-scene-3-1-5',
              number: 5,
              text: 'Подписывайся на канал, чтобы узнать больше!',
              visual: 'Кнопка подписки',
              duration: 3,
            },
          ],
          generatedAt: new Date('2024-01-15T12:01:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-3-1',
          overallScore: 5,
          overallComment: 'Хук слабый, нужно начать с вопроса или провокации. Структура хорошая, но не хватает эмоций.',
          createdAt: new Date('2024-01-15T12:02:00Z'),
          sceneComments: [
            {
              sceneId: 'mock-scene-3-1-1',
              sceneNumber: 1,
              comments: [
                {
                  id: 'comment-3-1-1',
                  type: 'negative',
                  text: 'Хук слишком общий, не захватывает внимание. Нужен вопрос или провокация',
                },
              ],
            },
            {
              sceneId: 'mock-scene-3-1-3',
              sceneNumber: 3,
              comments: [
                {
                  id: 'comment-3-1-2',
                  type: 'suggestion',
                  text: 'Добавь конкретные цифры: сколько сейсмографов используется, какой объём данных',
                },
              ],
            },
            {
              sceneId: 'mock-scene-3-1-4',
              sceneNumber: 4,
              comments: [
                {
                  id: 'comment-3-1-3',
                  type: 'info',
                  text: 'Хорошо, что упомянута точность',
                },
              ],
            },
          ],
        },
      },
      {
        id: 'mock-iter-3-2',
        version: 2,
        createdAt: new Date('2024-01-15T12:03:00Z'),
        script: {
          id: 'mock-script-version-3-2',
          scenes: [
            {
              id: 'mock-scene-3-2-1',
              number: 1,
              text: 'Что если бы ты знал о землетрясении за неделю до того, как оно произойдёт?',
              visual: 'Календарь показывает дату землетрясения за неделю до события',
              duration: 4,
              changes: {
                added: [],
                removed: [],
                modified: true,
              },
            },
            {
              id: 'mock-scene-3-2-2',
              number: 2,
              text: 'Новый алгоритм ИИ может это делать. Система анализирует данные с 10,000 сейсмографов по всему миру.',
              visual: 'Карта мира с точками сейсмографов, затем алгоритм анализирует данные',
              duration: 9,
              changes: {
                added: ['visual'],
                removed: [],
                modified: true,
              },
            },
            {
              id: 'mock-scene-3-2-3',
              number: 3,
              text: 'ИИ обрабатывает терабайты данных каждую секунду и предсказывает землетрясения с точностью 70%.',
              visual: 'Визуализация обработки данных: потоки информации → ИИ → предупреждение',
              duration: 11,
              changes: {
                added: [],
                removed: [],
                modified: true,
              },
            },
            {
              id: 'mock-scene-3-2-4',
              number: 4,
              text: 'Это может спасти миллионы жизней. Уже протестировано на данных за последние 10 лет.',
              visual: 'График спасённых жизней, затем временная шкала тестирования',
              duration: 8,
              changes: {
                added: [],
                removed: [],
                modified: true,
              },
            },
            {
              id: 'mock-scene-3-2-5',
              number: 5,
              text: 'Подписывайся, чтобы узнать больше о технологиях, которые меняют мир!',
              visual: 'Кнопка подписки с анимацией',
              duration: 4,
            },
          ],
          generatedAt: new Date('2024-01-15T12:03:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-3-2',
          overallScore: 7,
          overallComment: 'Лучше! Хук стал сильнее, добавлены цифры. Но можно усилить эмоциональную составляющую в twist.',
          createdAt: new Date('2024-01-15T12:04:00Z'),
          sceneComments: [
            {
              sceneId: 'mock-scene-3-2-1',
              sceneNumber: 1,
              comments: [
                {
                  id: 'comment-3-2-1',
                  type: 'positive',
                  text: 'Отличный хук! Вопрос сразу цепляет',
                },
              ],
            },
            {
              sceneId: 'mock-scene-3-2-2',
              sceneNumber: 2,
              comments: [
                {
                  id: 'comment-3-2-2',
                  type: 'positive',
                  text: 'Хорошо, что добавлены конкретные цифры',
                },
              ],
            },
            {
              sceneId: 'mock-scene-3-2-4',
              sceneNumber: 4,
              comments: [
                {
                  id: 'comment-3-2-3',
                  type: 'suggestion',
                  text: 'Можно добавить конкретные примеры спасённых жизней или городов',
                },
              ],
            },
          ],
        },
      },
      {
        id: 'mock-iter-3-3',
        version: 3,
        createdAt: new Date('2024-01-15T12:05:00Z'),
        script: {
          id: 'mock-script-version-3-3',
          scenes: [
            {
              id: 'mock-scene-3-3-1',
              number: 1,
              text: 'Что если бы ты знал о землетрясении за неделю до того, как оно произойдёт?',
              visual: 'Календарь показывает дату землетрясения за неделю до события',
              duration: 4,
            },
            {
              id: 'mock-scene-3-3-2',
              number: 2,
              text: 'Новый алгоритм ИИ может это делать. Система анализирует данные с 10,000 сейсмографов по всему миру.',
              visual: 'Карта мира с точками сейсмографов, затем алгоритм анализирует данные',
              duration: 9,
            },
            {
              id: 'mock-scene-3-3-3',
              number: 3,
              text: 'ИИ обрабатывает терабайты данных каждую секунду и предсказывает землетрясения с точностью 70%.',
              visual: 'Визуализация обработки данных: потоки информации → ИИ → предупреждение',
              duration: 11,
            },
            {
              id: 'mock-scene-3-3-4',
              number: 4,
              text: 'Это может спасти миллионы жизней. В Японии система уже предупредила о 3 землетрясениях, позволив эвакуировать 50,000 человек.',
              visual: 'Карта Японии, затем показываются эвакуированные люди',
              duration: 10,
              changes: {
                added: ['visual'],
                removed: [],
                modified: true,
              },
            },
            {
              id: 'mock-scene-3-3-5',
              number: 5,
              text: 'Подписывайся, чтобы узнать больше о технологиях, которые меняют мир!',
              visual: 'Кнопка подписки с анимацией',
              duration: 4,
            },
          ],
          generatedAt: new Date('2024-01-15T12:05:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-3-3',
          overallScore: 8,
          overallComment: 'Отличный сценарий! Добавлены конкретные примеры, twist стал сильнее. Готов к продакшену, но можно ещё немного улучшить CTA.',
          createdAt: new Date('2024-01-15T12:06:00Z'),
          sceneComments: [
            {
              sceneId: 'mock-scene-3-3-4',
              sceneNumber: 4,
              comments: [
                {
                  id: 'comment-3-3-1',
                  type: 'positive',
                  text: 'Отлично! Конкретные примеры делают twist намного сильнее',
                },
              ],
            },
            {
              sceneId: 'mock-scene-3-3-5',
              sceneNumber: 5,
              comments: [
                {
                  id: 'comment-3-3-2',
                  type: 'suggestion',
                  text: 'CTA можно сделать более конкретным, добавить вопрос',
                },
              ],
            },
          ],
        },
      },
    ],
  },
];

/**
 * Получить мок скрипт по ID
 */
export function getMockScript(id: string): NewsScript | undefined {
  return mockScripts.find((s) => s.id === id);
}

/**
 * Получить все мок скрипты
 */
export function getAllMockScripts(): NewsScript[] {
  return mockScripts;
}

/**
 * Получить мок скрипты по статусу
 */
export function getMockScriptsByStatus(status: NewsScript['status']): NewsScript[] {
  return mockScripts.filter((s) => s.status === status);
}
