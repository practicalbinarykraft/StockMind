import { AISettings, NewsScript, Iteration, ScriptVersion, Review, ScriptScene, SceneComment } from '../types'

export const defaultAISettings: AISettings = {
  scriptwriterPrompt: 'Системный промпт для AI-сценариста...',
  editorPrompt: 'Системный промпт для AI-редактора...',
  maxIterations: 3,
  autoSendToHumanReview: false,
  examples: [],
}

export const mockNewsScripts: NewsScript[] = [
  {
    id: '1',
    newsTitle: 'Новый прорыв в области искусственного интеллекта',
    newsSource: 'TechCrunch',
    status: 'in_progress',
    currentIteration: 2,
    maxIterations: 3,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    iterations: [
      {
        id: 'iter-1-1',
        version: 1,
        createdAt: new Date('2024-01-15T10:05:00Z'),
        script: {
          id: 'script-1-1',
          version: 1,
          generatedAt: new Date('2024-01-15T10:05:00Z'),
          status: 'sent_for_review',
          scenes: [
            {
              id: 'scene-1-1-1',
              number: 1,
              text: 'Представьте мир, где искусственный интеллект может создавать произведения искусства не хуже человека.',
              visual: 'Абстрактное изображение нейросети, создающей картину',
              duration: 5,
            },
            {
              id: 'scene-1-1-2',
              number: 2,
              text: 'Ученые из Стэнфорда разработали алгоритм, который анализирует миллионы изображений и создает что-то совершенно новое.',
              visual: 'Ученые за компьютерами, визуализация алгоритма',
              duration: 7,
            },
            {
              id: 'scene-1-1-3',
              number: 3,
              text: 'Это открытие меняет наше понимание того, что значит быть творческим.',
              visual: 'Философский образ творчества',
              duration: 4,
            },
          ],
        },
        review: {
          id: 'review-1-1',
          overallScore: 7,
          overallComment: 'Хороший старт, но нужно больше эмоций и динамики. Первая сцена слишком длинная.',
          createdAt: new Date('2024-01-15T10:10:00Z'),
          sceneComments: [
            {
              sceneId: 'scene-1-1-1',
              sceneNumber: 1,
              comments: [
                { id: 'c1', type: 'positive', text: 'Хорошо: сильный хук в начале' },
                { id: 'c2', type: 'negative', text: 'Исправить: слишком длинно, сократить до 3-4 секунд' },
                { id: 'c3', type: 'suggestion', text: 'Предложение: добавить больше визуальной динамики' },
              ],
            },
            {
              sceneId: 'scene-1-1-2',
              sceneNumber: 2,
              comments: [
                { id: 'c4', type: 'positive', text: 'Хорошо: конкретные детали делают историю убедительной' },
              ],
            },
          ],
        },
      },
      {
        id: 'iter-1-2',
        version: 2,
        createdAt: new Date('2024-01-15T10:15:00Z'),
        script: {
          id: 'script-1-2',
          version: 2,
          generatedAt: new Date('2024-01-15T10:15:00Z'),
          status: 'sent_for_review',
          scenes: [
            {
              id: 'scene-1-2-1',
              number: 1,
              text: 'ИИ теперь создает искусство не хуже человека.',
              visual: 'Абстрактное изображение нейросети, создающей картину',
              duration: 3,
              changes: {
                added: ['Сокращен текст'],
                removed: ['Длинное вступление'],
                modified: true,
              },
            },
            {
              id: 'scene-1-2-2',
              number: 2,
              text: 'Ученые из Стэнфорда разработали алгоритм, который анализирует миллионы изображений и создает что-то совершенно новое.',
              visual: 'Ученые за компьютерами, визуализация алгоритма',
              duration: 7,
            },
            {
              id: 'scene-1-2-3',
              number: 3,
              text: 'Это открытие меняет наше понимание творчества.',
              visual: 'Философский образ творчества',
              duration: 4,
            },
          ],
        },
        review: {
          id: 'review-1-2',
          overallScore: 8,
          overallComment: 'Значительно лучше! Первая сцена стала более динамичной. Можно добавить еще немного эмоций в финале.',
          createdAt: new Date('2024-01-15T10:20:00Z'),
          sceneComments: [
            {
              sceneId: 'scene-1-2-1',
              sceneNumber: 1,
              comments: [
                { id: 'c5', type: 'positive', text: 'Отлично: теперь сцена более динамичная' },
              ],
            },
            {
              sceneId: 'scene-1-2-3',
              sceneNumber: 3,
              comments: [
                { id: 'c6', type: 'suggestion', text: 'Предложение: добавить призыв к действию в конце' },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    id: '2',
    newsTitle: 'Космическая миссия достигла новой планеты',
    newsSource: 'BBC News',
    status: 'completed',
    currentIteration: 3,
    maxIterations: 3,
    createdAt: new Date('2024-01-15T09:00:00Z'),
    iterations: [
      {
        id: 'iter-2-1',
        version: 1,
        createdAt: new Date('2024-01-15T09:05:00Z'),
        script: {
          id: 'script-2-1',
          version: 1,
          generatedAt: new Date('2024-01-15T09:05:00Z'),
          status: 'sent_for_review',
          scenes: [
            {
              id: 'scene-2-1-1',
              number: 1,
              text: 'Космический аппарат достиг новой планеты в далекой галактике.',
              visual: 'Космический корабль приближается к планете',
              duration: 5,
            },
          ],
        },
        review: {
          id: 'review-2-1',
          overallScore: 6,
          overallComment: 'Нужно больше деталей и эмоций.',
          createdAt: new Date('2024-01-15T09:10:00Z'),
          sceneComments: [],
        },
      },
    ],
  },
  {
    id: '3',
    newsTitle: 'Прорыв в квантовых вычислениях',
    newsSource: 'Science Daily',
    status: 'pending',
    currentIteration: 0,
    maxIterations: 3,
    createdAt: new Date('2024-01-15T11:00:00Z'),
    iterations: [],
  },
]
