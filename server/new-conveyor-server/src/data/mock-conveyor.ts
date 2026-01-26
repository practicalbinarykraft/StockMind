/**
 * Мок данные для конвейера
 * Показывает процесс генерации сценариев с итерациями AI редактирования
 */

import { NewsScript } from '../lib/transformers';

export interface ConveyorItem {
  script: NewsScript;
  progress: {
    currentStep: 'scriptwriter' | 'editor' | 'completed' | 'human_review';
    progressPercent: number;
    estimatedTimeRemaining?: number; // секунды
  };
  statistics: {
    totalIterations: number;
    averageScore: number;
    bestScore: number;
  };
}

export const mockConveyorItems: ConveyorItem[] = [
  {
    script: {
      id: 'conveyor-1',
      newsTitle: 'Нейросеть научилась создавать музыку в стиле любого исполнителя',
      newsSource: 'MusicTech',
      status: 'in_progress',
      currentIteration: 1,
      maxIterations: 3,
      createdAt: new Date('2024-01-15T14:00:00Z'),
      iterations: [
        {
          id: 'conv-iter-1-1',
          version: 1,
          createdAt: new Date('2024-01-15T14:01:00Z'),
          script: {
            id: 'conv-script-1-1',
            scenes: [
              {
                id: 'conv-scene-1-1-1',
                number: 1,
                text: 'Теперь ИИ может писать музыку как Битлз или Эминем.',
                visual: 'Логотипы разных исполнителей, затем появляется ИИ',
                duration: 4,
              },
              {
                id: 'conv-scene-1-1-2',
                number: 2,
                text: 'Новая нейросеть анализирует стиль любого артиста и создаёт новые треки.',
                visual: 'Визуализация анализа музыки: волны звука → паттерны → новая композиция',
                duration: 9,
              },
              {
                id: 'conv-scene-1-1-3',
                number: 3,
                text: 'Система обучена на миллионах песен и может имитировать вокал, инструменты и аранжировку.',
                visual: 'График обучения: миллионы песен → обучение → генерация',
                duration: 11,
              },
              {
                id: 'conv-scene-1-1-4',
                number: 4,
                text: 'Но музыканты недовольны: это угрожает их профессии.',
                visual: 'Музыканты протестуют, затем показывается конфликт',
                duration: 7,
              },
              {
                id: 'conv-scene-1-1-5',
                number: 5,
                text: 'Ставь лайк, если думаешь что ИИ заменит музыкантов!',
                visual: 'Кнопка лайка с анимацией',
                duration: 3,
              },
            ],
            generatedAt: new Date('2024-01-15T14:01:30Z'),
            status: 'sent_for_review',
          },
          review: {
            id: 'conv-review-1-1',
            overallScore: 6,
            overallComment: 'Хорошая структура, но хук можно улучшить. Добавь больше конкретики: сколько песен в базе, точность имитации.',
            createdAt: new Date('2024-01-15T14:02:00Z'),
            sceneComments: [
              {
                sceneId: 'conv-scene-1-1-1',
                sceneNumber: 1,
                comments: [
                  {
                    id: 'conv-comment-1-1-1',
                    type: 'suggestion',
                    text: 'Хук можно сделать более провокационным, добавить вопрос',
                  },
                ],
              },
              {
                sceneId: 'conv-scene-1-1-3',
                sceneNumber: 3,
                comments: [
                  {
                    id: 'conv-comment-1-1-2',
                    type: 'negative',
                    text: 'Нужны конкретные цифры: сколько именно песен, какая точность имитации',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    progress: {
      currentStep: 'scriptwriter',
      progressPercent: 35,
      estimatedTimeRemaining: 120,
    },
    statistics: {
      totalIterations: 1,
      averageScore: 6,
      bestScore: 6,
    },
  },
  {
    script: {
      id: 'conveyor-2',
      newsTitle: 'Учёные создали батарею, которая заряжается за 5 минут',
      newsSource: 'TechNews',
      status: 'in_progress',
      currentIteration: 2,
      maxIterations: 3,
      createdAt: new Date('2024-01-15T14:10:00Z'),
      iterations: [
        {
          id: 'conv-iter-2-1',
          version: 1,
          createdAt: new Date('2024-01-15T14:11:00Z'),
          script: {
            id: 'conv-script-2-1',
            scenes: [
              {
                id: 'conv-scene-2-1-1',
                number: 1,
                text: 'Зарядка телефона занимает часы.',
                visual: 'Таймер показывает долгую зарядку',
                duration: 3,
              },
              {
                id: 'conv-scene-2-1-2',
                number: 2,
                text: 'Но теперь есть решение: новая батарея заряжается за 5 минут.',
                visual: 'Таймер быстро отсчитывает 5 минут, батарея заряжается',
                duration: 6,
              },
              {
                id: 'conv-scene-2-1-3',
                number: 3,
                text: 'Технология использует новый тип электродов, который ускоряет зарядку в 12 раз.',
                visual: 'Сравнение: старая батарея vs новая, показывается ускорение',
                duration: 10,
              },
              {
                id: 'conv-scene-2-1-4',
                number: 4,
                text: 'Батарея уже протестирована и скоро появится в смартфонах.',
                visual: 'Тестирование батареи, затем показывается смартфон',
                duration: 7,
              },
              {
                id: 'conv-scene-2-1-5',
                number: 5,
                text: 'Подписывайся, чтобы узнать больше!',
                visual: 'Кнопка подписки',
                duration: 3,
              },
            ],
            generatedAt: new Date('2024-01-15T14:11:30Z'),
            status: 'sent_for_review',
          },
          review: {
            id: 'conv-review-2-1',
            overallScore: 5,
            overallComment: 'Хук слишком слабый, нужно начать с провокации. Добавь конкретные цифры: ёмкость батареи, сколько циклов зарядки выдерживает.',
            createdAt: new Date('2024-01-15T14:12:00Z'),
            sceneComments: [
              {
                sceneId: 'conv-scene-2-1-1',
                sceneNumber: 1,
                comments: [
                  {
                    id: 'conv-comment-2-1-1',
                    type: 'negative',
                    text: 'Хук слишком общий, не цепляет. Нужен вопрос или провокация',
                  },
                ],
              },
              {
                sceneId: 'conv-scene-2-1-3',
                sceneNumber: 3,
                comments: [
                  {
                    id: 'conv-comment-2-1-2',
                    type: 'negative',
                    text: 'Нужны конкретные цифры: ёмкость, количество циклов зарядки',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'conv-iter-2-2',
          version: 2,
          createdAt: new Date('2024-01-15T14:13:00Z'),
          script: {
            id: 'conv-script-2-2',
            scenes: [
              {
                id: 'conv-scene-2-2-1',
                number: 1,
                text: 'Что если бы твой телефон заряжался за 5 минут вместо 2 часов?',
                visual: 'Сравнение: 2 часа vs 5 минут на таймере',
                duration: 4,
                changes: {
                  added: [],
                  removed: [],
                  modified: true,
                },
              },
              {
                id: 'conv-scene-2-2-2',
                number: 2,
                text: 'Новая батарея делает это возможным. Технология использует специальные электроды.',
                visual: 'Схема батареи с новыми электродами',
                duration: 7,
                changes: {
                  added: [],
                  removed: [],
                  modified: true,
                },
              },
              {
                id: 'conv-scene-2-2-3',
                number: 3,
                text: 'Батарея ёмкостью 4000 мАч заряжается за 5 минут и выдерживает 1000 циклов зарядки без деградации.',
                visual: 'Технические характеристики батареи на экране',
                duration: 11,
                changes: {
                  added: ['visual'],
                  removed: [],
                  modified: true,
                },
              },
              {
                id: 'conv-scene-2-2-4',
                number: 4,
                text: 'Уже протестирована на 10,000 устройств. Появится в смартфонах в следующем году.',
                visual: 'Массовое тестирование, затем календарь показывает дату выхода',
                duration: 9,
                changes: {
                  added: [],
                  removed: [],
                  modified: true,
                },
              },
              {
                id: 'conv-scene-2-2-5',
                number: 5,
                text: 'Подписывайся, чтобы узнать больше о технологиях будущего!',
                visual: 'Кнопка подписки с анимацией',
                duration: 4,
              },
            ],
            generatedAt: new Date('2024-01-15T14:13:30Z'),
            status: 'sent_for_review',
          },
          review: {
            id: 'conv-review-2-2',
            overallScore: 8,
            overallComment: 'Отлично! Хук стал сильнее, добавлены конкретные цифры. Готов к продакшену.',
            createdAt: new Date('2024-01-15T14:14:00Z'),
            sceneComments: [
              {
                sceneId: 'conv-scene-2-2-1',
                sceneNumber: 1,
                comments: [
                  {
                    id: 'conv-comment-2-2-1',
                    type: 'positive',
                    text: 'Отличный хук! Сравнение сразу цепляет',
                  },
                ],
              },
              {
                sceneId: 'conv-scene-2-2-3',
                sceneNumber: 3,
                comments: [
                  {
                    id: 'conv-comment-2-2-2',
                    type: 'positive',
                    text: 'Отлично! Добавлены все необходимые технические характеристики',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    progress: {
      currentStep: 'editor',
      progressPercent: 75,
      estimatedTimeRemaining: 45,
    },
    statistics: {
      totalIterations: 2,
      averageScore: 6.5,
      bestScore: 8,
    },
  },
  {
    script: {
      id: 'conveyor-3',
      newsTitle: 'ИИ научился читать мысли через сканирование мозга',
      newsSource: 'NeuroTech',
      status: 'completed',
      currentIteration: 2,
      maxIterations: 3,
      createdAt: new Date('2024-01-15T14:20:00Z'),
      iterations: [
        {
          id: 'conv-iter-3-1',
          version: 1,
          createdAt: new Date('2024-01-15T14:21:00Z'),
          script: {
            id: 'conv-script-3-1',
            scenes: [
              {
                id: 'conv-scene-3-1-1',
                number: 1,
                text: 'ИИ может читать твои мысли.',
                visual: 'Мозг человека, затем ИИ анализирует сигналы',
                duration: 3,
              },
              {
                id: 'conv-scene-3-1-2',
                number: 2,
                text: 'Новая система сканирует активность мозга и расшифровывает мысли.',
                visual: 'Сканирование мозга, затем появляется текст мыслей',
                duration: 8,
              },
              {
                id: 'conv-scene-3-1-3',
                number: 3,
                text: 'Технология использует фМРТ и машинное обучение для декодирования мыслей.',
                visual: 'Схема работы: фМРТ → ИИ → текст',
                duration: 10,
              },
              {
                id: 'conv-scene-3-1-4',
                number: 4,
                text: 'Точность пока составляет 80%, но это прорыв.',
                visual: 'График точности',
                duration: 6,
              },
              {
                id: 'conv-scene-3-1-5',
                number: 5,
                text: 'Подписывайся!',
                visual: 'Кнопка подписки',
                duration: 2,
              },
            ],
            generatedAt: new Date('2024-01-15T14:21:30Z'),
            status: 'sent_for_review',
          },
          review: {
            id: 'conv-review-3-1',
            overallScore: 4,
            overallComment: 'Хук слишком короткий и не цепляет. Нужно больше эмоций и конкретики. CTA слишком короткий.',
            createdAt: new Date('2024-01-15T14:22:00Z'),
            sceneComments: [
              {
                sceneId: 'conv-scene-3-1-1',
                sceneNumber: 1,
                comments: [
                  {
                    id: 'conv-comment-3-1-1',
                    type: 'negative',
                    text: 'Хук слишком короткий, не вызывает эмоций. Нужен вопрос или провокация',
                  },
                ],
              },
              {
                sceneId: 'conv-scene-3-1-3',
                sceneNumber: 3,
                comments: [
                  {
                    id: 'conv-comment-3-1-2',
                    type: 'suggestion',
                    text: 'Добавь больше деталей: сколько участников тестирования, какие мысли можно читать',
                  },
                ],
              },
              {
                sceneId: 'conv-scene-3-1-5',
                sceneNumber: 5,
                comments: [
                  {
                    id: 'conv-comment-3-1-3',
                    type: 'negative',
                    text: 'CTA слишком короткий, нужно добавить больше мотивации',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'conv-iter-3-2',
          version: 2,
          createdAt: new Date('2024-01-15T14:23:00Z'),
          script: {
            id: 'conv-script-3-2',
            scenes: [
              {
                id: 'conv-scene-3-2-1',
                number: 1,
                text: 'Что если бы кто-то мог читать твои мысли прямо сейчас?',
                visual: 'Человек думает, затем появляется текст его мыслей',
                duration: 4,
                changes: {
                  added: [],
                  removed: [],
                  modified: true,
                },
              },
              {
                id: 'conv-scene-3-2-2',
                number: 2,
                text: 'ИИ уже умеет это делать. Система сканирует активность мозга и расшифровывает мысли с точностью 80%.',
                visual: 'Сканирование мозга, затем показывается точность на графике',
                duration: 9,
                changes: {
                  added: [],
                  removed: [],
                  modified: true,
                },
              },
              {
                id: 'conv-scene-3-2-3',
                number: 3,
                text: 'Технология протестирована на 100 добровольцах. ИИ может читать простые мысли: цвета, предметы, эмоции.',
                visual: 'Группа людей в сканере, затем примеры читаемых мыслей',
                duration: 12,
                changes: {
                  added: ['visual'],
                  removed: [],
                  modified: true,
                },
              },
              {
                id: 'conv-scene-3-2-4',
                number: 4,
                text: 'Это может помочь людям с параличом общаться. Но поднимает вопросы о приватности.',
                visual: 'Человек с параличом общается через мысленный интерфейс, затем показывается вопрос приватности',
                duration: 10,
                changes: {
                  added: [],
                  removed: [],
                  modified: true,
                },
              },
              {
                id: 'conv-scene-3-2-5',
                number: 5,
                text: 'Ставь лайк, если думаешь что это прорыв или угроза приватности!',
                visual: 'Кнопка лайка с анимацией, затем показывается дилемма',
                duration: 5,
                changes: {
                  added: [],
                  removed: [],
                  modified: true,
                },
              },
            ],
            generatedAt: new Date('2024-01-15T14:23:30Z'),
            status: 'sent_for_review',
          },
          review: {
            id: 'conv-review-3-2',
            overallScore: 9,
            overallComment: 'Отличный сценарий! Хук сильный, добавлены конкретные цифры и примеры. Twist с приватностью добавляет глубины. Готов к продакшену!',
            createdAt: new Date('2024-01-15T14:24:00Z'),
            sceneComments: [
              {
                sceneId: 'conv-scene-3-2-1',
                sceneNumber: 1,
                comments: [
                  {
                    id: 'conv-comment-3-2-1',
                    type: 'positive',
                    text: 'Отличный хук! Вопрос сразу вызывает эмоции и заставляет задуматься',
                  },
                ],
              },
              {
                sceneId: 'conv-scene-3-2-3',
                sceneNumber: 3,
                comments: [
                  {
                    id: 'conv-comment-3-2-2',
                    type: 'positive',
                    text: 'Отлично! Конкретные цифры и примеры делают информацию убедительной',
                  },
                ],
              },
              {
                sceneId: 'conv-scene-3-2-4',
                sceneNumber: 4,
                comments: [
                  {
                    id: 'conv-comment-3-2-3',
                    type: 'positive',
                    text: 'Отличный twist! Вопрос приватности добавляет глубины и провоцирует дискуссию',
                  },
                ],
              },
              {
                sceneId: 'conv-scene-3-2-5',
                sceneNumber: 5,
                comments: [
                  {
                    id: 'conv-comment-3-2-4',
                    type: 'positive',
                    text: 'Отличный CTA! Вопрос в конце провоцирует взаимодействие',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    progress: {
      currentStep: 'completed',
      progressPercent: 100,
    },
    statistics: {
      totalIterations: 2,
      averageScore: 6.5,
      bestScore: 9,
    },
  },
];

/**
 * Получить все мок данные для конвейера
 */
export function getAllMockConveyorItems(): ConveyorItem[] {
  return mockConveyorItems;
}

/**
 * Получить мок данные конвейера по статусу
 */
export function getMockConveyorItemsByStatus(status: NewsScript['status']): ConveyorItem[] {
  return mockConveyorItems.filter((item) => item.script.status === status);
}

/**
 * Получить мок данные конвейера по ID
 */
export function getMockConveyorItem(id: string): ConveyorItem | undefined {
  return mockConveyorItems.find((item) => item.script.id === id);
}
