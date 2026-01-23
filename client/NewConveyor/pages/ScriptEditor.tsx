import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, ArrowLeft, Sparkles, Check, X, RefreshCw, Plus, MessageSquare, FileText, CheckCircle } from 'lucide-react'
import { Script, Scene } from '../types'
import { useError } from '../contexts/ErrorContext'
import { ApiException, isConnectionError } from '../utils/api'
import Button from '../components/ui/Button'

// Моковые данные для демонстрации
const mockScript: Script = {
  id: '1',
  newsId: '1',
  newsTitle: 'Новый прорыв в области искусственного интеллекта',
  scenes: [
    {
      id: 's1',
      order: 1,
      text: 'Представьте мир, где искусственный интеллект может создавать произведения искусства не хуже человека.',
      alternatives: [
        'ИИ теперь способен создавать шедевры, которые невозможно отличить от работ великих мастеров.',
        'Новая эра наступила: искусственный интеллект пишет картины, которые заставляют задуматься о природе творчества.',
        'Революция в искусстве: алгоритмы научились не просто копировать, а создавать уникальные произведения.',
      ],
    },
    {
      id: 's2',
      order: 2,
      text: 'Ученые из Стэнфорда разработали алгоритм, который анализирует миллионы изображений и создает что-то совершенно новое.',
      alternatives: [
        'Команда исследователей обучила нейросеть на огромной базе данных и получила невероятный результат.',
        'Новый алгоритм использует глубокое обучение для генерации уникальных визуальных образов.',
        'Технология машинного обучения позволила создать систему, которая понимает эстетику и композицию.',
      ],
    },
    {
      id: 's3',
      order: 3,
      text: 'Это открытие меняет наше понимание того, что значит быть творческим.',
      alternatives: [
        'Теперь мы должны переосмыслить саму концепцию творчества и авторства.',
        'Граница между человеческим и машинным творчеством становится все более размытой.',
        'Этот прорыв ставит перед нами фундаментальные вопросы о природе искусства.',
      ],
    },
  ],
  createdAt: '2024-01-15T11:00:00Z',
  updatedAt: '2024-01-15T11:00:00Z',
  status: 'review',
  sourceType: 'rss',
  sourceName: 'TechCrunch',
  score: 87,
  hasAudio: false,
  hasAvatar: false,
}

export default function ScriptEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showError } = useError()
  const [script, setScript] = useState<Script>(mockScript)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(script.scenes[0]?.id || null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [promptText, setPromptText] = useState<string>('')
  // Локальное состояние для редактируемого текста (не применяется сразу)
  const [editingText, setEditingText] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const selectedScene = script.scenes.find((s) => s.id === selectedSceneId)

  // Инициализация текста для редактирования при выборе сцены
  useEffect(() => {
    if (selectedScene) {
      setEditingText(selectedScene.text)
      setHasUnsavedChanges(false)
    }
  }, [selectedSceneId])

  const handleSceneTextChange = (sceneId: string, newText: string) => {
    setScript({
      ...script,
      scenes: script.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, text: newText } : scene
      ),
    })
  }

  const handleUseAlternative = (sceneId: string, alternativeIndex: number) => {
    const scene = script.scenes.find((s) => s.id === sceneId)
    if (scene && scene.alternatives[alternativeIndex]) {
      setEditingText(scene.alternatives[alternativeIndex])
      setHasUnsavedChanges(true)
    }
  }

  // Сохранение изменений текущей сцены в основную структуру данных
  const handleSaveScene = () => {
    if (selectedSceneId && editingText.trim()) {
      handleSceneTextChange(selectedSceneId, editingText)
      setHasUnsavedChanges(false)
    }
  }

  // Отмена изменений - возврат к исходному тексту
  const handleCancelScene = () => {
    if (selectedScene) {
      setEditingText(selectedScene.text)
      setHasUnsavedChanges(false)
    }
  }

  // Добавление новой сцены
  const handleAddScene = () => {
    // Сохраняем изменения текущей сцены перед добавлением новой
    if (hasUnsavedChanges && selectedSceneId) {
      handleSaveScene()
    }

    const newOrder = script.scenes.length + 1
    const newScene: Scene = {
      id: `s${Date.now()}`,
      order: newOrder,
      text: 'Новая сцена. Введите текст...',
      alternatives: [],
    }

    setScript({
      ...script,
      scenes: [...script.scenes, newScene],
    })

    // Автоматически выбираем новую сцену для редактирования
    setSelectedSceneId(newScene.id)
    setEditingText(newScene.text)
    setHasUnsavedChanges(false)
  }

  // Перегенерация всех вариантов замены для текущей сцены
  const handleRegenerateAlternatives = async (customPrompt?: string) => {
    if (!selectedSceneId || !selectedScene) return

    setIsRegenerating(true)
    try {
      // Имитация API запроса для генерации новых вариантов
      // В реальном приложении здесь будет: await post(`/api/scenes/${selectedSceneId}/regenerate-alternatives`, { prompt: customPrompt })
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Генерируем новые варианты на основе текущего текста сцены и промпта
      // В реальном приложении варианты придут с сервера через API
      const baseText = selectedScene.text
      const promptHint = customPrompt ? ` (${customPrompt})` : ''
      const newAlternatives = [
        `Альтернативная формулировка${promptHint}: ${baseText.split('.').slice(0, 2).join('.')}. Это открывает новые возможности для творческого подхода.`,
        `Переработанный вариант${promptHint}: ${baseText.split(',').slice(0, 1).join(',')}, что представляет собой значительный шаг вперед в развитии технологий.`,
        `Обновленная версия${promptHint}: ${baseText.substring(0, Math.floor(baseText.length * 0.6))}... Это демонстрирует потенциал современных решений.`,
      ]

      // Обновляем варианты в сцене
      setScript({
        ...script,
        scenes: script.scenes.map((scene) =>
          scene.id === selectedSceneId
            ? { ...scene, alternatives: newAlternatives }
            : scene
        ),
      })

      // Закрываем модальное окно промпта после успешной генерации
      if (customPrompt) {
        setIsPromptModalOpen(false)
        setPromptText('')
      }
    } catch (error) {
      console.error('Ошибка перегенерации вариантов:', error)
      if (error instanceof ApiException && isConnectionError(error)) {
        showError(error, () => {
          handleRegenerateAlternatives(customPrompt)
        })
      } else {
        alert('Не удалось перегенерировать варианты. Попробуйте еще раз.')
      }
    } finally {
      setIsRegenerating(false)
    }
  }

  // Открытие модального окна для ввода промпта
  const handleOpenPromptModal = () => {
    setIsPromptModalOpen(true)
  }

  // Перегенерация с промптом из модального окна
  const handleRegenerateWithPrompt = () => {
    if (promptText.trim()) {
      handleRegenerateAlternatives(promptText.trim())
    }
  }

  // Сохранение в черновики
  const handleSaveToDrafts = async () => {
    setIsSaving(true)
    try {
      // Имитация сохранения в черновики (в реальном приложении здесь будет API запрос)
      // Пример: await post(`/api/drafts/${id}`, { ...script, status: 'draft' })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      setIsSaving(false)
      // Перенаправление в черновики
      navigate('/drafts')
    } catch (error) {
      setIsSaving(false)
      
      // Обработка ошибок соединения
      if (error instanceof ApiException && isConnectionError(error)) {
        showError(error, () => {
          handleSaveToDrafts()
        })
      } else {
        console.error('Ошибка сохранения в черновики:', error)
        alert('Не удалось сохранить в черновики. Попробуйте еще раз.')
      }
    }
  }

  // Сохранение в готовые сценарии
  const handleSaveToScripts = async () => {
    setIsSaving(true)
    try {
      // Имитация сохранения в готовые сценарии (в реальном приложении здесь будет API запрос)
      // Пример: await post(`/api/scripts/${id}`, { ...script, status: 'completed' })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      setIsSaving(false)
      // Перенаправление в готовые сценарии
      navigate('/scripts')
    } catch (error) {
      setIsSaving(false)
      
      // Обработка ошибок соединения
      if (error instanceof ApiException && isConnectionError(error)) {
        showError(error, () => {
          handleSaveToScripts()
        })
      } else {
        console.error('Ошибка сохранения в готовые сценарии:', error)
        alert('Не удалось сохранить в готовые сценарии. Попробуйте еще раз.')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/drafts')}
            className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Редактор сценария</h2>
            <p className="text-gray-400 text-sm mt-1">{script.newsTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveToDrafts}
            disabled={isSaving}
            variant="secondary"
            size="md"
            leftIcon={<FileText className="w-4 h-4" />}
            isLoading={isSaving}
          >
            Сохранить в черновики
          </Button>
          <Button
            onClick={handleSaveToScripts}
            disabled={isSaving}
            variant="primary"
            size="md"
            leftIcon={<CheckCircle className="w-4 h-4" />}
            isLoading={isSaving}
          >
            Сохранить в готовые
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Левая колонка - список сцен */}
        <div className="lg:col-span-1 self-start">
          <div className="glass rounded-xl p-4 glow-border sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-bold text-white">Сцены</h3>
              </div>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {script.scenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => {
                    // Сохраняем изменения текущей сцены перед переключением
                    if (hasUnsavedChanges && selectedSceneId) {
                      handleSaveScene()
                    }
                    setSelectedSceneId(scene.id)
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedSceneId === scene.id
                      ? 'bg-primary-500/20 border border-primary-500/30 text-primary-400'
                      : 'bg-dark-700/30 border border-dark-600/50 text-gray-300 hover:bg-dark-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-400">
                      Сцена {scene.order}
                    </span>
                    {selectedSceneId === scene.id && (
                      <Check className="w-4 h-4 text-primary-400" />
                    )}
                  </div>
                  <p className="text-sm line-clamp-2">{scene.text}</p>
                </button>
              ))}
            </div>
            <button
              onClick={handleAddScene}
              className="w-full mt-4 p-3 rounded-lg border-2 border-dashed border-primary-500/30 hover:border-primary-500/50 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 hover:text-primary-300 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Добавить сцену</span>
            </button>
          </div>
        </div>

        {/* Правая часть - редактор и варианты */}
        <div className="lg:col-span-3 self-start">
          {selectedScene ? (
            <div className="space-y-6">
              {/* Текущий текст сцены */}
              <div className="glass rounded-xl p-6 glow-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Текущий текст сцены</h3>
                  <span className="text-sm text-gray-400">Сцена {selectedScene.order}</span>
                </div>
                <textarea
                  value={editingText}
                  onChange={(e) => {
                    setEditingText(e.target.value)
                    setHasUnsavedChanges(e.target.value !== selectedScene.text)
                  }}
                  className="w-full h-32 px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none transition-all"
                  placeholder="Введите текст сцены..."
                />
                {/* Кнопки сохранения и отмены */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700/50">
                  <Button
                    onClick={handleSaveScene}
                    disabled={!hasUnsavedChanges || !editingText.trim()}
                    variant="primary"
                    size="md"
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Сохранить
                  </Button>
                  <Button
                    onClick={handleCancelScene}
                    disabled={!hasUnsavedChanges}
                    variant="secondary"
                    size="md"
                    leftIcon={<X className="w-4 h-4" />}
                  >
                    Назад
                  </Button>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-yellow-400 ml-auto">
                      Есть несохраненные изменения
                    </span>
                  )}
                </div>
              </div>

              {/* Варианты замены */}
              {selectedScene.alternatives.length > 0 && (
                <div className="glass rounded-xl p-6 glow-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary-400" />
                      <h3 className="text-lg font-bold text-white">Варианты замены</h3>
                      <span className="text-sm text-gray-400">
                        Выберите лучший вариант или оставьте текущий
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleOpenPromptModal}
                        disabled={isRegenerating}
                        variant="secondary"
                        size="sm"
                        leftIcon={<MessageSquare className="w-4 h-4" />}
                      >
                        Промпт
                      </Button>
                      <Button
                        onClick={() => handleRegenerateAlternatives()}
                        disabled={isRegenerating}
                        variant="secondary"
                        size="sm"
                        leftIcon={
                          isRegenerating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )
                        }
                      >
                        {isRegenerating ? 'Генерация...' : 'Перегенерировать'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedScene.alternatives.map((alternative, index) => (
                      <div
                        key={index}
                        className="glass rounded-lg p-4 border border-dark-700/50 hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/20 transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => handleUseAlternative(selectedScene.id, index)}
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-primary-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Вариант {index + 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUseAlternative(selectedScene.id, index)
                              }}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg text-xs transition-all"
                            >
                              Использовать
                            </button>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">{alternative}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-gray-400">Выберите сцену для редактирования</p>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно для ввода промпта */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-xl p-6 glow-border max-w-2xl w-full animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-bold text-white">Введите инструкции для перегенерации</h3>
              </div>
              <button
                onClick={() => {
                  setIsPromptModalOpen(false)
                  setPromptText('')
                }}
                className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Опишите, что именно вы хотите изменить в вариантах текста. Например: "Сделать более эмоциональным", "Упростить формулировку", "Добавить больше деталей".
            </p>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none transition-all mb-4"
              placeholder="Например: Сделать текст более динамичным и захватывающим..."
            />
            <div className="flex items-center gap-3 justify-end">
              <Button
                onClick={() => {
                  setIsPromptModalOpen(false)
                  setPromptText('')
                }}
                variant="secondary"
                size="md"
              >
                Отмена
              </Button>
              <Button
                onClick={handleRegenerateWithPrompt}
                disabled={!promptText.trim() || isRegenerating}
                variant="primary"
                size="md"
                leftIcon={
                  isRegenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )
                }
              >
                {isRegenerating ? 'Генерация...' : 'Перегенерировать с промптом'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

