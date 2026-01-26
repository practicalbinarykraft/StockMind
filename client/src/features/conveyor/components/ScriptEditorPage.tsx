/**
 * Страница редактора сценария
 */

import { useState, useEffect } from 'react'
import { useLocation, useRoute } from 'wouter'
import { Save, ArrowLeft, Plus, Sparkles, Check, X, RefreshCw, MessageSquare, FileText, CheckCircle } from 'lucide-react'
import { useScript } from '../hooks/use-scripts'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { Textarea } from '@/shared/ui/textarea'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { scriptsService } from '../services/scriptsService'
import { useToast } from '@/shared/hooks/use-toast'
import { queryClient } from '@/shared/api'
import type { Scene } from '../types'

export function ScriptEditorPage() {
  const [, navigate] = useLocation()
  const [, params] = useRoute('/conveyor/drafts/:id')
  const scriptId = params?.id || ''
  const { toast } = useToast()

  const { data: script, isLoading } = useScript(scriptId)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [promptText, setPromptText] = useState<string>('')
  const [lengthOption, setLengthOption] = useState<'keep' | 'increase' | 'decrease'>('keep')

  const selectedScene = script?.scenes?.find((s: any) => s.id === selectedSceneId)

  // Инициализация при загрузке скрипта
  useEffect(() => {
    if (script?.scenes && script.scenes.length > 0 && !selectedSceneId) {
      setSelectedSceneId(script.scenes[0].id)
    }
  }, [script, selectedSceneId])

  // Инициализация текста для редактирования при выборе сцены
  useEffect(() => {
    if (selectedScene) {
      setEditingText(selectedScene.text)
      setHasUnsavedChanges(false)
    }
  }, [selectedSceneId, selectedScene])

  const handleTextChange = (text: string) => {
    setEditingText(text)
    setHasUnsavedChanges(text !== selectedScene?.text)
  }

  const handleSaveScene = async () => {
    if (!selectedSceneId || !script || !scriptId) return
    
    try {
      setIsSaving(true)
      await scriptsService.updateScene(scriptId, selectedSceneId, { text: editingText })
      
      // Инвалидируем кеш для обновления данных
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      
      setHasUnsavedChanges(false)
      toast({
        title: 'Успешно',
        description: 'Сцена сохранена',
      })
    } catch (error) {
      console.error('Error saving scene:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить сцену',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelScene = () => {
    if (selectedScene) {
      setEditingText(selectedScene.text)
      setHasUnsavedChanges(false)
    }
  }

  const handleAddScene = async () => {
    if (!script || !scriptId) return
    
    try {
      setIsSaving(true)
      
      // Создаем новую сцену
      const newScene = {
        id: `scene-${Date.now()}`,
        order: script.scenes.length + 1,
        text: 'Новая сцена...',
        alternatives: [],
      }
      
      // Добавляем сцену в массив
      const updatedScenes = [...script.scenes, newScene]
      await scriptsService.updateScriptUniversal(scriptId, { scenes: updatedScenes })
      
      // Инвалидируем кеш для обновления данных
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      
      // Выбираем новую сцену
      setSelectedSceneId(newScene.id)
      
      toast({
        title: 'Успешно',
        description: 'Сцена добавлена',
      })
    } catch (error) {
      console.error('Error adding scene:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить сцену',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveToDrafts = async () => {
    setIsSaving(true)
    try {
      // Сохраняем текущие изменения если есть
      if (hasUnsavedChanges && selectedSceneId) {
        await scriptsService.updateScene(scriptId, selectedSceneId, { text: editingText })
      }
      
      // Обновляем статус на draft (если он другой)
      if (script?.status !== 'draft') {
        await scriptsService.updateScriptUniversal(scriptId, { status: 'draft' })
      }
      
      toast({
        title: 'Успешно',
        description: 'Сохранено в черновики',
      })
      navigate('/conveyor/drafts')
    } catch (error) {
      console.error('Error saving to drafts:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить в черновики',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveToScripts = async () => {
    setIsSaving(true)
    try {
      // Сохраняем текущие изменения если есть
      if (hasUnsavedChanges && selectedSceneId) {
        await scriptsService.updateScene(scriptId, selectedSceneId, { text: editingText })
      }
      
      // Обновляем статус на completed (готов к использованию)
      await scriptsService.updateScriptUniversal(scriptId, { status: 'completed' })
      
      toast({
        title: 'Успешно',
        description: 'Сценарий готов к использованию',
      })
      navigate('/conveyor/scripts')
    } catch (error) {
      console.error('Error saving to scripts:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить сценарий',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUseAlternative = (alternativeIndex: number) => {
    if (selectedScene && selectedScene.alternatives && selectedScene.alternatives[alternativeIndex]) {
      setEditingText(selectedScene.alternatives[alternativeIndex])
      setHasUnsavedChanges(true)
    }
  }

  const handleRegenerateAlternatives = async (customPrompt?: string, lengthOpt?: 'keep' | 'increase' | 'decrease') => {
    if (!selectedScene || !scriptId) return
    
    setIsRegenerating(true)
    try {
      const sourceWordCount = selectedScene.text.split(/\s+/).length
      console.log(`[Regenerate] Source text: ${sourceWordCount} words`, {
        text: selectedScene.text,
        customPrompt,
        lengthOption: lengthOpt || lengthOption,
      })
      
      // Генерируем новые варианты для текущей сцены
      const result = await scriptsService.generateVariants({
        sourceText: selectedScene.text,
        prompt: customPrompt,
        format: lengthOpt === 'increase' ? 'long' : lengthOpt === 'decrease' ? 'short' : 'base',
        lengthOption: lengthOpt || lengthOption,
      })
      
      console.log('[Regenerate] Generate variants result:', result)
      
      // API возвращает { scenes: [...], variants: { 0: [...], 1: [...] } }
      // Берем варианты из первой сцены (индекс 0)
      let alternatives: string[] = []
      
      if (result.variants && typeof result.variants === 'object') {
        // Получаем варианты первой сцены
        const firstSceneVariants = result.variants[0] || result.variants['0']
        if (Array.isArray(firstSceneVariants)) {
          alternatives = firstSceneVariants.map((v: any) => 
            typeof v === 'string' ? v : v.text
          )
        }
      } else if (Array.isArray(result.variants)) {
        // Если вернулся массив (старый формат)
        alternatives = result.variants
      }
      
      // Обновляем альтернативы сцены
      await scriptsService.updateScene(scriptId, selectedScene.id, {
        alternatives,
      })
      
      // Инвалидируем кеш для обновления данных
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      
      toast({
        title: 'Успешно',
        description: `Сгенерировано ${alternatives.length || 0} вариантов`,
      })
      
      if (customPrompt) {
        setIsPromptModalOpen(false)
        setPromptText('')
        setLengthOption('keep')
      }
    } catch (error) {
      console.error('Error regenerating alternatives:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось сгенерировать альтернативы',
        variant: 'destructive',
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleOpenPromptModal = () => {
    setIsPromptModalOpen(true)
  }

  const handleRegenerateWithPrompt = () => {
    handleRegenerateAlternatives(promptText.trim() || undefined, lengthOption)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-4 gap-6">
          <Skeleton className="h-[600px] col-span-1" />
          <Skeleton className="h-[600px] col-span-3" />
        </div>
      </div>
    )
  }

  if (!script) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/conveyor/drafts')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">Сценарий не найден</h2>
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
            onClick={() => navigate('/conveyor/drafts')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">{script.newsTitle}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {script.sourceName || 'Источник неизвестен'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveToDrafts}
            disabled={isSaving}
            variant="outline"
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Сохранить в черновики
          </Button>
          <Button
            onClick={handleSaveToScripts}
            disabled={isSaving}
            className="gap-2"
          >
            <CheckCircle className="w-4 h-4" />
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
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Сцены</h3>
              </div>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {script.scenes?.map((scene: Scene) => (
                <button
                  key={scene.id}
                  onClick={() => {
                    if (hasUnsavedChanges && selectedSceneId) {
                      handleSaveScene()
                    }
                    setSelectedSceneId(scene.id)
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedSceneId === scene.id
                      ? 'bg-primary/20 border border-primary/30 text-primary'
                      : 'bg-muted/30 border border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Сцена {scene.order}
                    </span>
                    {selectedSceneId === scene.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-sm line-clamp-2">{scene.text}</p>
                </button>
              ))}
            </div>
            <button
              onClick={handleAddScene}
              className="w-full mt-4 p-3 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary transition-all flex items-center justify-center gap-2"
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
                  <h3 className="text-lg font-bold">Текущий текст сцены</h3>
                  <span className="text-sm text-muted-foreground">Сцена {selectedScene.order}</span>
                </div>
                <Textarea
                  value={editingText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full h-32 bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all"
                  placeholder="Введите текст сцены..."
                />
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                  <Button
                    onClick={handleSaveScene}
                    disabled={!hasUnsavedChanges || !editingText.trim()}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Сохранить
                  </Button>
                  <Button
                    onClick={handleCancelScene}
                    disabled={!hasUnsavedChanges}
                    variant="outline"
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Отменить
                  </Button>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-yellow-400 ml-auto">
                      Есть несохраненные изменения
                    </span>
                  )}
                </div>
              </div>

              {/* Варианты замены */}
              <div className="glass rounded-xl p-6 glow-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">Варианты замены</h3>
                    <span className="text-sm text-muted-foreground">
                      Выберите лучший вариант или оставьте текущий
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleOpenPromptModal}
                      disabled={isRegenerating}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Промпт
                    </Button>
                    <Button
                      onClick={() => handleRegenerateAlternatives()}
                      disabled={isRegenerating}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                      {isRegenerating ? 'Генерация...' : 'Перегенерировать'}
                    </Button>
                  </div>
                </div>
                
                {selectedScene.alternatives && selectedScene.alternatives.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedScene.alternatives.map((alternative: string, index: number) => (
                      <div
                        key={index}
                        className="glass rounded-lg p-4 border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => handleUseAlternative(index)}
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-primary flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Вариант {index + 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUseAlternative(index)
                              }}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs transition-all"
                            >
                              Использовать
                            </button>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">{alternative}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base mb-2">Варианты еще не сгенерированы</p>
                    <p className="text-sm">
                      Нажмите "Перегенерировать" чтобы создать альтернативные варианты текста
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-muted-foreground">Выберите сцену для редактирования</p>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно для ввода промпта */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-xl p-6 glow-border max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Введите инструкции для перегенерации</h3>
              </div>
              <button
                onClick={() => {
                  setIsPromptModalOpen(false)
                  setPromptText('')
                  setLengthOption('keep')
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Настройка длины текста */}
            <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border">
              <label className="text-sm font-medium mb-3 block">Длина текста для вариантов:</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    value="decrease"
                    checked={lengthOption === 'decrease'}
                    onChange={(e) => setLengthOption(e.target.value as any)}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Короче</div>
                    <div className="text-xs text-muted-foreground">~70% от оригинала</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    value="keep"
                    checked={lengthOption === 'keep'}
                    onChange={(e) => setLengthOption(e.target.value as any)}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Та же</div>
                    <div className="text-xs text-muted-foreground">Как в оригинале</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    value="increase"
                    checked={lengthOption === 'increase'}
                    onChange={(e) => setLengthOption(e.target.value as any)}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Длиннее</div>
                    <div className="text-xs text-muted-foreground">~130% от оригинала</div>
                  </div>
                </label>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Опишите дополнительные требования к вариантам текста (опционально).
            </p>
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full h-32 bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all mb-4"
              placeholder={
                lengthOption === 'decrease' 
                  ? "Например: Оставь только главное, убери воду, сделай динамичнее..."
                  : lengthOption === 'increase'
                  ? "Например: Добавь конкретные примеры, больше деталей, покажи эмоции..."
                  : "Например: Сделать более эмоциональным, добавить конкретные цифры..."
              }
            />
            <div className="flex items-center gap-3 justify-end">
              <Button
                onClick={() => {
                  setIsPromptModalOpen(false)
                  setPromptText('')
                }}
                variant="outline"
              >
                Отмена
              </Button>
              <Button
                onClick={handleRegenerateWithPrompt}
                disabled={isRegenerating}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Генерация...' : 'Перегенерировать'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
