import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { NewsScript, AISettings } from '../types'
import { AISettingsPanel } from '../components/script-generation/AISettingsPanel'
import { NewsScriptList } from '../components/script-generation/NewsScriptList'
import { IterationTimeline } from '../components/script-generation/IterationTimeline'
import {
  getScripts,
  getScript,
  getAISettings,
  updateAISettings,
  subscribeToGeneration,
  SSEEvent,
} from '../lib/services/scripts'

// Мок данные для демонстрации (используются если бэкенд недоступен)
const MOCK_SCRIPTS: NewsScript[] = [
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
          version: 1,
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
          ],
          generatedAt: new Date('2024-01-15T10:01:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-1-1',
          overallScore: 7,
          overallComment: 'Хороший сценарий, но можно улучшить хук и добавить больше конкретных цифр.',
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
          version: 2,
          scenes: [
            {
              id: 'mock-scene-1-2-1',
              number: 1,
              text: 'А что если я скажу, что теперь можно создать любое видео просто описав его словами?',
              visual: 'Человек печатает на клавиатуре, на экране появляется видео',
              duration: 3,
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
              text: 'Технология работает на основе GPT-4 и может создавать видео длительностью до 60 секунд с разрешением 1920x1080.',
              visual: 'Схема работы: GPT-4 → генерация кадров → объединение в видео',
              duration: 10,
              changes: {
                added: [],
                removed: [],
                modified: true,
              },
            },
          ],
          generatedAt: new Date('2024-01-15T10:03:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-1-2',
          overallScore: 9,
          overallComment: 'Отличный сценарий! Хук стал лучше, добавлены конкретные цифры. Готов к публикации.',
          createdAt: new Date('2024-01-15T10:04:00Z'),
          sceneComments: [],
        },
      },
    ],
  },
  {
    id: 'mock-script-2',
    newsTitle: 'Учёные создали материал, который может самовосстанавливаться',
    newsSource: 'ScienceDaily',
    status: 'human_review',
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
          version: 1,
          scenes: [
            {
              id: 'mock-scene-2-1-1',
              number: 1,
              text: 'Представь материал, который сам себя чинит.',
              visual: 'Материал с трещиной начинает самовосстанавливаться',
              duration: 5,
            },
            {
              id: 'mock-scene-2-1-2',
              number: 2,
              text: 'Учёные из MIT создали именно такой материал.',
              visual: 'Лаборатория MIT, учёные за работой',
              duration: 6,
            },
          ],
          generatedAt: new Date('2024-01-15T11:01:30Z'),
          status: 'sent_for_review',
        },
        review: {
          id: 'mock-review-2-1',
          overallScore: 6,
          overallComment: 'Сценарий слишком короткий, нужно добавить больше деталей о применении материала.',
          createdAt: new Date('2024-01-15T11:02:00Z'),
          sceneComments: [
            {
              sceneId: 'mock-scene-2-1-2',
              sceneNumber: 2,
              comments: [
                {
                  id: 'comment-2-1-1',
                  type: 'suggestion',
                  text: 'Добавить примеры применения: автомобили, самолёты, строительство',
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
    status: 'in_progress',
    currentIteration: 1,
    maxIterations: 3,
    createdAt: new Date('2024-01-15T12:00:00Z'),
    iterations: [
      {
        id: 'mock-iter-3-1',
        version: 1,
        createdAt: new Date('2024-01-15T12:01:00Z'),
        script: {
          id: 'mock-script-version-3-1',
          version: 1,
          scenes: [
            {
              id: 'mock-scene-3-1-1',
              number: 1,
              text: 'Что если землетрясения можно предсказывать за неделю?',
              visual: 'Сейсмограф показывает данные',
              duration: 4,
            },
            {
              id: 'mock-scene-3-1-2',
              number: 2,
              text: 'Новый алгоритм ИИ анализирует данные и предсказывает землетрясения.',
              visual: 'Алгоритм обрабатывает данные сейсмографов',
              duration: 7,
            },
          ],
          generatedAt: new Date('2024-01-15T12:01:30Z'),
          status: 'sent_for_review',
        },
        review: null,
      },
    ],
  },
]

const MOCK_SETTINGS: AISettings = {
  provider: 'anthropic',
  scriptwriterPrompt: '',
  editorPrompt: '',
  maxIterations: 3,
  autoSendToHumanReview: true,
  examples: [],
  hasAnthropicKey: false,
  hasDeepseekKey: false,
}

export default function ScriptGenerationPage() {
  const navigate = useNavigate()

  // State
  const [newsScripts, setNewsScripts] = useState<NewsScript[]>([])
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  const [aiSettings, setAISettings] = useState<AISettings | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(true)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // SSE connection
  const [activeSSE, setActiveSSE] = useState<string | null>(null)

  // Загрузка сценариев
  const loadScripts = useCallback(async () => {
    try {
      setError(null)
      const response = await getScripts()
      setNewsScripts(response.items)
    } catch (err) {
      console.warn('Бэкенд недоступен, используем мок данные:', err)
      // Используем мок данные если бэкенд недоступен
      setNewsScripts(MOCK_SCRIPTS)
      setError(null) // Убираем ошибку, так как используем мок данные
    }
  }, [])

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    try {
      const settings = await getAISettings()
      setAISettings(settings)
    } catch (err) {
      console.warn('Бэкенд недоступен, используем мок настройки:', err)
      // Используем мок настройки если бэкенд недоступен
      setAISettings(MOCK_SETTINGS)
    }
  }, [])

  // Первоначальная загрузка
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await Promise.all([loadScripts(), loadSettings()])
      } catch (err) {
        console.warn('Ошибка инициализации, используем мок данные:', err)
        // Если всё упало - используем мок данные
        setNewsScripts(MOCK_SCRIPTS)
        setAISettings(MOCK_SETTINGS)
        setError(null)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [loadScripts, loadSettings])

  // Обновление списка
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadScripts()
    setIsRefreshing(false)
  }

  // Сохранение настроек
  const handleSettingsChange = async (newSettings: AISettings) => {
    setAISettings(newSettings)
    try {
      await updateAISettings(newSettings)
    } catch (err) {
      console.error('Ошибка сохранения настроек:', err)
    }
  }

  // Выбор сценария и подписка на SSE
  const handleSelectScript = async (scriptId: string) => {
    setSelectedScriptId(scriptId)

    // Проверяем, есть ли сценарий в локальном состоянии
    const localScript = newsScripts.find(s => s.id === scriptId)
    if (localScript) {
      // Если сценарий в процессе - подписываемся на SSE
      if (localScript.status === 'in_progress') {
        subscribeToScriptEvents(scriptId)
      }
      return
    }

    // Загружаем полные данные сценария с бэкенда
    try {
      const fullScript = await getScript(scriptId)
      setNewsScripts(prev =>
        prev.map(s => s.id === scriptId ? fullScript : s)
      )

      // Если сценарий в процессе - подписываемся на SSE
      if (fullScript.status === 'in_progress') {
        subscribeToScriptEvents(scriptId)
      }
    } catch (err) {
      console.warn('Бэкенд недоступен, используем мок данные:', err)
      // Ищем в мок данных
      const mockScript = MOCK_SCRIPTS.find(s => s.id === scriptId)
      if (mockScript) {
        setNewsScripts(prev => {
          const exists = prev.find(s => s.id === scriptId)
          if (exists) return prev
          return [...prev, mockScript]
        })
      }
    }
  }

  // Подписка на SSE события
  const subscribeToScriptEvents = (scriptId: string) => {
    // Отключаем предыдущую подписку
    if (activeSSE) {
      // TODO: сохранить unsubscribe функцию и вызвать её
    }

    setActiveSSE(scriptId)

    const unsubscribe = subscribeToGeneration(
      scriptId,
      (event: SSEEvent) => {
        console.log('SSE Event:', event)
        handleSSEEvent(scriptId, event)
      },
      (error) => {
        console.error('SSE Error:', error)
        setActiveSSE(null)
      }
    )

    // Сохраняем функцию отписки
    return unsubscribe
  }

  // Обработка SSE событий
  const handleSSEEvent = async (scriptId: string, event: SSEEvent) => {
    switch (event.event) {
      case 'scriptwriter:completed':
      case 'editor:completed':
      case 'needs_revision':
      case 'completed':
      case 'max_iterations_reached':
        // Перезагружаем сценарий чтобы получить актуальные данные
        try {
          const updatedScript = await getScript(scriptId)
          setNewsScripts(prev =>
            prev.map(s => s.id === scriptId ? updatedScript : s)
          )
        } catch (err) {
          console.error('Ошибка обновления сценария:', err)
        }
        break

      case 'scriptwriter:thinking':
      case 'editor:thinking':
        // TODO: показывать "думание" AI в UI
        console.log('AI thinking:', event.data.content)
        break

      case 'error':
        console.error('Generation error:', event.data.message)
        setActiveSSE(null)
        break
    }
  }

  // Возврат к списку
  const handleBack = () => {
    setSelectedScriptId(null)
    setActiveSSE(null)
  }

  const selectedScript = newsScripts.find(s => s.id === selectedScriptId)

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-2xl font-bold text-white">AI-генерация сценариев</h2>
        </div>
        <div className="glass rounded-xl p-12 glow-border flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-3 text-gray-400">Загрузка данных...</span>
        </div>
      </div>
    )
  }

  // Error state - показываем только если нет данных вообще
  if (error && newsScripts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-2xl font-bold text-white">AI-генерация сценариев</h2>
        </div>
        <div className="glass rounded-xl p-6 glow-border border-red-500/30">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setIsLoading(true)
              loadScripts().finally(() => setIsLoading(false))
            }}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">AI-генерация сценариев</h2>
            <p className="text-gray-400 text-sm mt-1">{newsScripts.length} сценариев</p>
          </div>
        </div>

        {/* Refresh button */}
        {!selectedScriptId && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        )}
      </div>

      {/* AI Settings Panel */}
      {aiSettings && (
        <AISettingsPanel
          settings={aiSettings}
          onSettingsChange={handleSettingsChange}
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
        />
      )}

      {/* News Scripts List or Timeline */}
      {!selectedScriptId ? (
        <NewsScriptList
          scripts={newsScripts}
          onSelectScript={handleSelectScript}
        />
      ) : selectedScript ? (
        <IterationTimeline
          script={selectedScript}
          onBack={handleBack}
        />
      ) : (
        <div className="glass rounded-xl p-6 glow-border">
          <p className="text-gray-400">Сценарий не найден</p>
        </div>
      )}
    </div>
  )
}
