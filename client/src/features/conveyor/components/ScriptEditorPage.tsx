/**
 * Страница редактора сценария
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useRoute } from 'wouter'
import { ArrowLeft, Plus, Sparkles, Check, X, RefreshCw, MessageSquare, FileText, CheckCircle, Edit, Loader2 } from 'lucide-react'
import { useScript } from '../hooks/use-scripts'
import { useConveyorEvents } from '../hooks/use-conveyor-events'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { Textarea } from '@/shared/ui/textarea'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { scriptsService } from '../services/scriptsService'
import { useToast } from '@/shared/hooks/use-toast'
import { queryClient } from '@/shared/api'
import { RecoveryBanner } from './script-generation/RecoveryBanner'
import type { Scene } from '../types'

export function ScriptEditorPage() {
  const [, navigate] = useLocation()
  const [, params] = useRoute('/conveyor/editor/:id')
  const scriptId = params?.id || ''
  const { toast } = useToast()

  // Определяем режим работы из query параметра
  const searchParams = new URLSearchParams(window.location.search)
  const mode = (searchParams.get('mode') as 'review' | 'draft') || 'draft'
  const isReviewMode = mode === 'review'

  const { data: script, isLoading } = useScript(scriptId)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [promptText, setPromptText] = useState<string>('')
  const [lengthOption, setLengthOption] = useState<'keep' | 'increase' | 'decrease'>('keep')
  
  // Состояния для регенерации всего сценария (режим рецензии)
  const [isRegeneratingScript, setIsRegeneratingScript] = useState(false)
  const [isScriptPromptModalOpen, setIsScriptPromptModalOpen] = useState(false)
  const [scriptPromptText, setScriptPromptText] = useState('')

  // Recovery state
  const [hasRecoverableCheckpoints, setHasRecoverableCheckpoints] = useState(false)
  const [checkpoints, setCheckpoints] = useState<Array<any>>([])

  // Conveyor events for regeneration tracking
  const { messages: conveyorMessages, isProcessing: isConveyorProcessing, isConnected: isConveyorConnected } = useConveyorEvents()
  
  // Determine if regeneration is in progress based on conveyor events
  const regenerationStatus = useCallback(() => {
    if (!isRegeneratingScript && !isConveyorProcessing) return null
    
    // Find the latest message related to our script
    const relevantMessages = conveyorMessages
      .filter(m => m.message?.toLowerCase().includes('ревизия') || m.message?.toLowerCase().includes('регенер'))
      .slice(-5)
    
    const lastMessage = relevantMessages[relevantMessages.length - 1]
    return lastMessage?.message || 'Регенерация в процессе...'
  }, [conveyorMessages, isRegeneratingScript, isConveyorProcessing])

  const selectedScene = script?.scenes?.find((s: any) => s.id === selectedSceneId)
  
  // Проверка checkpoint'ов при загрузке
  useEffect(() => {
    const checkRecovery = async () => {
      if (!scriptId) return
      
      try {
        const result = await scriptsService.getCheckpoints(scriptId)
        
        if (result.hasCheckpoints && result.checkpoints.length > 0) {
          setHasRecoverableCheckpoints(true)
          setCheckpoints(result.checkpoints)
        }
      } catch (error) {
        console.error('Failed to check for checkpoints:', error)
      }
    }
    
    checkRecovery()
  }, [scriptId])
  
  // Восстановление из checkpoint
  const handleRestoreCheckpoint = async (checkpointId: string) => {
    setIsSaving(true)
    try {
      const restoredScript = await scriptsService.restoreFromCheckpoint(scriptId, checkpointId)
      
      // Скрыть баннер recovery
      setHasRecoverableCheckpoints(false)
      setCheckpoints([])
      
      // Инвалидировать кэш
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      
      // Обновить UI
      if (restoredScript.scenes.length > 0) {
        setSelectedSceneId(restoredScript.scenes[0].id)
        setEditingText(restoredScript.scenes[0].text || '')
      }
      
      toast({ 
        title: 'Успешно', 
        description: 'Изменения восстановлены' 
      })
    } catch (error: any) {
      console.error('Failed to restore checkpoint:', error)
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Не удалось восстановить изменения', 
        variant: 'destructive' 
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  const dismissCheckpoints = () => {
    setHasRecoverableCheckpoints(false)
    setCheckpoints([])
  }

  // Инициализация при загрузке скрипта
  useEffect(() => {
    if (script?.scenes && script.scenes.length > 0 && !selectedSceneId) {
      setSelectedSceneId(script.scenes[0].id)
    }
  }, [script, selectedSceneId])

  // Refs для автосохранения
  const prevSceneIdRef = useRef<string | null>(null)
  const editingTextRef = useRef<string>('')
  const hasUnsavedChangesRef = useRef(false)
  const isChangingSceneRef = useRef(false)
  const lastSavedScenesRef = useRef<Map<string, string>>(new Map())
  
  // Обновляем refs при изменении состояния
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges
  }, [hasUnsavedChanges])
  
  useEffect(() => {
    editingTextRef.current = editingText
  }, [editingText])

  // Функция сохранения текущих изменений (async)
  const saveCurrentChanges = useCallback(async (sceneId?: string, text?: string) => {
    const targetSceneId = sceneId || selectedSceneId
    const targetText = text ?? editingTextRef.current
    
    if (!scriptId || !targetSceneId) return false
    
    // Проверяем, изменился ли текст с последнего сохранения
    const lastSavedText = lastSavedScenesRef.current.get(targetSceneId)
    if (lastSavedText === targetText) {
      console.log('[Autosave] No changes to save for scene', targetSceneId)
      return true
    }
    
    try {
      const currentScript = await scriptsService.getScriptUniversal(scriptId)
      const updatedScenes = currentScript.scenes.map(scene =>
        scene.id === targetSceneId ? { ...scene, text: targetText } : scene
      )
      await scriptsService.updateScriptUniversal(scriptId, { scenes: updatedScenes })
      
      // Запоминаем что сохранили
      lastSavedScenesRef.current.set(targetSceneId, targetText)
      
      console.log('[Autosave] Saved changes for scene', targetSceneId)
      return true
    } catch (error) {
      console.error('[Autosave] Failed to save:', error)
      return false
    }
  }, [scriptId, selectedSceneId])

  // Функция переключения сцены с автосохранением
  const handleSceneChange = useCallback(async (newSceneId: string) => {
    if (newSceneId === selectedSceneId || isChangingSceneRef.current) return
    
    isChangingSceneRef.current = true
    
    // Сохраняем текущую сцену перед переключением
    if (selectedSceneId && hasUnsavedChangesRef.current) {
      console.log('[SceneChange] Saving current scene before switch:', selectedSceneId)
      await saveCurrentChanges(selectedSceneId, editingTextRef.current)
    }
    
    // Переключаемся на новую сцену
    prevSceneIdRef.current = selectedSceneId
    setSelectedSceneId(newSceneId)
    setHasUnsavedChanges(false)
    
    isChangingSceneRef.current = false
  }, [selectedSceneId, saveCurrentChanges])

  // Инициализация текста для редактирования при выборе сцены
  // НЕ обновляем текст если сейчас идёт смена сцены или перегенерация
  useEffect(() => {
    if (selectedScene && !isChangingSceneRef.current && !isRegenerating) {
      // Проверяем, что мы не перезаписываем пользовательские изменения
      const savedText = lastSavedScenesRef.current.get(selectedScene.id)
      if (savedText === undefined || savedText === selectedScene.text) {
        setEditingText(selectedScene.text)
        setHasUnsavedChanges(false)
        lastSavedScenesRef.current.set(selectedScene.id, selectedScene.text)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSceneId]) // Намеренно игнорируем selectedScene и isRegenerating - нужна инициализация только при смене ID
  
  // Автосохранение при выходе из редактора (beforeunload) и при размонтировании
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current && selectedSceneId) {
        // Сохраняем через sendBeacon (работает даже при закрытии страницы)
        if (navigator.sendBeacon && scriptId) {
          const data = JSON.stringify({
            scriptId,
            sceneId: selectedSceneId,
            text: editingTextRef.current
          })
          navigator.sendBeacon('/api/scripts/autosave', data)
          console.log('[Autosave] Sent beacon on beforeunload')
        }
        
        // Показываем предупреждение пользователю
        e.preventDefault()
        e.returnValue = 'У вас есть несохранённые изменения. Вы уверены, что хотите покинуть страницу?'
        return e.returnValue
      }
    }
    
    // Сохраняем при размонтировании (навигация внутри приложения)
    const saveOnUnmount = () => {
      if (hasUnsavedChangesRef.current && scriptId && selectedSceneId) {
        // Используем синхронный XMLHttpRequest для гарантии сохранения
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/scripts/autosave', false) // sync
        xhr.setRequestHeader('Content-Type', 'application/json')
        try {
          xhr.send(JSON.stringify({
            scriptId,
            sceneId: selectedSceneId,
            text: editingTextRef.current
          }))
          console.log('[Autosave] Saved on unmount via XHR')
        } catch (e) {
          console.error('[Autosave] Failed to save on unmount:', e)
        }
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      saveOnUnmount()
    }
  }, [scriptId, selectedSceneId])

  const handleTextChange = (text: string) => {
    if (isReviewMode) return // В режиме рецензии редактирование отключено
    setEditingText(text)
    setHasUnsavedChanges(text !== selectedScene?.text)
  }

  // Удалена функция handleSaveScene - теперь сохранение только через кнопки "в черновики" и "в готовые"

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
      
      // Сначала сохраняем текущую сцену если есть изменения
      if (selectedSceneId && hasUnsavedChangesRef.current) {
        await saveCurrentChanges(selectedSceneId, editingTextRef.current)
      }
      
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
      
      // Выбираем новую сцену (напрямую, так как это новая сцена)
      setSelectedSceneId(newScene.id)
      setEditingText(newScene.text)
      setHasUnsavedChanges(false)
      lastSavedScenesRef.current.set(newScene.id, newScene.text)
      
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

  // Определяем, является ли скрипт auto_script (по наличию специфичных полей)
  const isAutoScript = !!(script as any)?.conveyorItemId || !!(script as any)?.finalScore || !!(script as any)?.gateDecision

  // Кнопка "Сохранить" - обновляет auto_script напрямую (для блока "Сценарии на рецензии")
  const handleSave = async () => {
    if (!hasUnsavedChanges || !selectedSceneId) {
      toast({
        title: 'Нет изменений',
        description: 'Нет несохраненных изменений',
      })
      return
    }

    setIsSaving(true)
    try {
      // Обновляем текущую сцену
      const currentScript = await scriptsService.getScriptUniversal(scriptId)
      const updatedScenes = currentScript.scenes.map(scene =>
        scene.id === selectedSceneId ? { ...scene, text: editingText } : scene
      )
      
      await scriptsService.updateScriptUniversal(scriptId, { scenes: updatedScenes })
      
      setHasUnsavedChanges(false)
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      
      toast({
        title: 'Успешно',
        description: 'Изменения сохранены',
      })
    } catch (error) {
      console.error('Error saving:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить изменения',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Кнопка "Сохранить в готовые" - сохраняет в scripts_library со статусом ready
  const handleSaveToReady = async () => {
    setIsSaving(true)
    try {
      // Сохраняем текущие изменения если есть
      if (hasUnsavedChanges && selectedSceneId) {
        const currentScript = await scriptsService.getScriptUniversal(scriptId)
        const updatedScenes = currentScript.scenes.map(scene =>
          scene.id === selectedSceneId ? { ...scene, text: editingText } : scene
        )
        await scriptsService.updateScriptUniversal(scriptId, { scenes: updatedScenes })
      }

      // Если это auto_script - создаём копию в библиотеке со статусом ready
      if (isAutoScript) {
        await scriptsService.saveAutoScriptToLibrary(scriptId, 'ready')
        toast({
          title: 'Успешно',
          description: 'Сценарий сохранён в готовые',
        })
      } else {
        // Обновляем статус на ready (готов к использованию)
        await scriptsService.updateScript(scriptId, { status: 'ready' })
        toast({
          title: 'Успешно',
          description: 'Сценарий готов к использованию',
        })
      }
      
      setHasUnsavedChanges(false)
      await queryClient.invalidateQueries({ queryKey: ['scripts'] })
      
      navigate('/conveyor/scripts')
    } catch (error) {
      console.error('Error saving to ready:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить сценарий',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Кнопка "Сохранить новую версию в черновики" / "Редактировать сцены" (в зависимости от режима)
  const handleSaveNewVersionAsDraft = async () => {
    setIsSaving(true)
    try {
      // Сохраняем текущие изменения если есть
      if (hasUnsavedChanges && selectedSceneId) {
        const currentScript = await scriptsService.getScriptUniversal(scriptId)
        const updatedScenes = currentScript.scenes.map(scene =>
          scene.id === selectedSceneId ? { ...scene, text: editingText } : scene
        )
        await scriptsService.updateScriptUniversal(scriptId, { scenes: updatedScenes })
      }

      // В режиме рецензии - сохраняем в черновики и переходим на страницу черновиков
      if (isReviewMode && isAutoScript) {
        await scriptsService.saveAutoScriptToLibrary(scriptId, 'draft')
        
        setHasUnsavedChanges(false)
        // Инвалидируем все связанные кэши
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['scripts'] }),
          queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] }),
          queryClient.invalidateQueries({ queryKey: ['scripts', scriptId, 'iterations'] }),
        ])
        
        toast({
          title: 'Успешно',
          description: 'Сценарий сохранён в черновики',
        })
        
        navigate('/conveyor/drafts')
        return
      }

      // В режиме черновика - создаем новую версию
      if (isAutoScript) {
        // Для auto_scripts - создаем новую версию в timeline + сохраняем в черновики
        const result = await scriptsService.saveNewVersionAsDraft(scriptId)
        
        console.log('[SaveVersion] Result:', result)
        
        setHasUnsavedChanges(false)
        // Инвалидируем все связанные кэши сразу
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['scripts'] }),
          queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] }),
          queryClient.invalidateQueries({ queryKey: ['scripts', scriptId, 'iterations'] }),
        ])
        
        // Также обновляем кэш для конкретного скрипта чтобы таймлайн обновился
        queryClient.refetchQueries({ queryKey: ['scripts', scriptId, 'iterations'] })
        
        toast({
          title: (result as any).isUpdate ? 'Черновик обновлён' : 'Версия сохранена',
          description: result.message || 'Новая версия сохранена в черновики',
        })
      } else {
        // Для scripts_library - создаем новую версию в timeline
        const result = await scriptsService.createLibraryScriptVersion(scriptId)
        
        setHasUnsavedChanges(false)
        // Инвалидируем все связанные кэши
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['scripts'] }),
          queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] }),
          queryClient.invalidateQueries({ queryKey: ['scripts', scriptId, 'iterations'] }),
        ])
        
        // Также обновляем кэш для конкретного скрипта
        queryClient.refetchQueries({ queryKey: ['scripts', scriptId, 'iterations'] })
        
        toast({
          title: 'Успешно',
          description: result.message || 'Новая версия создана',
        })
      }
    } catch (error) {
      console.error('Error saving new version:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить новую версию',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Функция для регенерации всего сценария (режим рецензии)
  const handleRegenerateScript = async (customPrompt?: string) => {
    if (!scriptId) {
      console.error('[Regenerate] No scriptId')
      return
    }
    
    console.log('[Regenerate] Starting regeneration', { 
      scriptId, 
      customPrompt,
      scriptStatus: (script as any)?.status,
      isAutoScript 
    })
    
    setIsRegeneratingScript(true)
    try {
      const result = await scriptsService.regenerateScript(scriptId, customPrompt)
      
      console.log('[Regenerate] API response:', result)
      
      toast({
        title: 'Регенерация запущена',
        description: result.message || 'AI перегенерирует сценарий. Это может занять несколько минут.',
      })
      
      if (customPrompt) {
        setIsScriptPromptModalOpen(false)
        setScriptPromptText('')
      }
      
      // Инвалидируем кеш для обновления данных через небольшую задержку
      // чтобы дать время бэкенду начать обработку
      setTimeout(async () => {
        await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
        await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId, 'iterations'] })
      }, 2000)
    } catch (error: any) {
      console.error('[Regenerate] Error:', error)
      
      // Более подробная обработка ошибок
      let errorMessage = 'Не удалось запустить регенерацию сценария'
      if (error.message?.includes('400')) {
        errorMessage = 'Сценарий в неподходящем статусе для регенерации. Возможно, он уже обрабатывается.'
      } else if (error.message?.includes('404')) {
        errorMessage = 'Сценарий не найден'
      } else if (error.message?.includes('403')) {
        errorMessage = 'Нет доступа к этому сценарию'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Ошибка регенерации',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsRegeneratingScript(false)
    }
  }

  const handleUseAlternative = (alternativeIndex: number) => {
    if (selectedScene && selectedScene.alternatives && selectedScene.alternatives[alternativeIndex]) {
      setEditingText(selectedScene.alternatives[alternativeIndex])
      setHasUnsavedChanges(true)
    }
  }

  const handleRegenerateAlternatives = async (customPrompt?: string, lengthOpt?: 'keep' | 'increase' | 'decrease') => {
    if (!selectedScene || !scriptId || !selectedSceneId) return
    
    setIsRegenerating(true)
    
    // ВАЖНО: Сохраняем текущий текст из редактора (не из кэша!)
    // Это предотвращает подмену текста при обновлении кэша
    const currentEditingText = editingTextRef.current
    const currentSceneId = selectedSceneId
    
    try {
      const sourceWordCount = currentEditingText.split(/\s+/).length
      console.log(`[Regenerate] Source text: ${sourceWordCount} words`, {
        text: currentEditingText,
        customPrompt,
        lengthOption: lengthOpt || lengthOption,
      })
      
      // Генерируем новые варианты для текущей сцены
      // ВАЖНО: Используем текст из редактора, а не из selectedScene
      const result = await scriptsService.generateVariants({
        sourceText: currentEditingText,
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
      
      // Обновляем альтернативы сцены, сохраняя текущий текст!
      await scriptsService.updateScene(scriptId, currentSceneId, {
        alternatives,
        text: currentEditingText, // Сохраняем текущий текст вместе с альтернативами
      })
      
      // Обновляем lastSavedScenesRef чтобы не сбросился текст
      lastSavedScenesRef.current.set(currentSceneId, currentEditingText)
      
      // Если есть промпт, сохраняем комментарий к сцене
      if (customPrompt && customPrompt.trim() && script) {
        try {
          const sceneIndex = script.scenes.findIndex((s: Scene) => s.id === currentSceneId)
          await scriptsService.saveSceneComment({
            scriptId,
            scriptType: isAutoScript ? 'auto' : 'library',
            sceneId: currentSceneId,
            sceneIndex,
            commentText: customPrompt.trim(),
            commentType: 'prompt',
          })
          console.log('[Regenerate] Scene comment saved')
        } catch (commentError) {
          console.error('[Regenerate] Failed to save comment:', commentError)
          // Не показываем ошибку пользователю, так как главное действие (генерация) успешно
        }
      }
      
      // Инвалидируем кеш для обновления данных
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      
      // ВАЖНО: Восстанавливаем текст после инвалидации кэша
      // чтобы он не сбросился к старому значению
      if (selectedSceneId === currentSceneId) {
        setEditingText(currentEditingText)
        setHasUnsavedChanges(false)
      }
      
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
      {/* Recovery Banner */}
      {hasRecoverableCheckpoints && checkpoints.length > 0 && (
        <RecoveryBanner
          checkpoints={checkpoints}
          onRestore={handleRestoreCheckpoint}
          onDismiss={dismissCheckpoints}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(isReviewMode ? '/conveyor/reviews' : '/conveyor/drafts')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{script.newsTitle}</h2>
              <Badge variant={isReviewMode ? 'default' : 'secondary'}>
                {isReviewMode ? 'Рецензия' : 'Редактирование'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {script.sourceName || 'Источник неизвестен'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Индикатор процесса регенерации */}
          {(isRegeneratingScript || isConveyorProcessing) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-primary">
                {regenerationStatus() || 'Регенерация...'}
              </span>
            </div>
          )}
          
          {isReviewMode ? (
            // Режим рецензии
            <>
              <Button
                onClick={() => handleRegenerateScript()}
                disabled={isRegeneratingScript || isConveyorProcessing}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRegeneratingScript || isConveyorProcessing ? 'animate-spin' : ''}`} />
                Перегенерировать сценарий
              </Button>
              <Button
                onClick={() => setIsScriptPromptModalOpen(true)}
                disabled={isRegeneratingScript || isConveyorProcessing}
                variant="outline"
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Перегенерировать с промптом
              </Button>
              <Button
                onClick={handleSaveNewVersionAsDraft}
                disabled={isSaving || isRegeneratingScript || isConveyorProcessing}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Редактировать сцены
              </Button>
            </>
          ) : (
            // Режим черновика
            <>
              <Button
                onClick={handleSaveNewVersionAsDraft}
                disabled={isSaving}
                variant="outline"
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Сохранить новую версию
              </Button>
              <Button
                onClick={handleSaveToReady}
                disabled={isSaving}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Сохранить в готовые
              </Button>
            </>
          )}
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
                  onClick={() => handleSceneChange(scene.id)}
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
                  className={`w-full h-32 bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all ${
                    isReviewMode ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                  placeholder={isReviewMode ? 'Текст доступен только для просмотра' : 'Введите текст сцены...'}
                  readOnly={isReviewMode}
                  disabled={isReviewMode}
                />
                {!isReviewMode && (
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
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
                )}
              </div>

              {/* Варианты замены (скрыто в режиме рецензии) */}
              {!isReviewMode && (
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
              )}
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

      {/* Модальное окно для промпта регенерации всего сценария (режим рецензии) */}
      {isScriptPromptModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-xl p-6 glow-border max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Инструкции для перегенерации сценария</h3>
              </div>
              <button
                onClick={() => {
                  setIsScriptPromptModalOpen(false)
                  setScriptPromptText('')
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Опишите, как должен измениться сценарий. AI перегенерирует его полностью с учётом ваших пожеланий.
            </p>
            <Textarea
              value={scriptPromptText}
              onChange={(e) => setScriptPromptText(e.target.value)}
              className="w-full h-32 bg-muted/50 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all mb-4"
              placeholder="Например: Сделать более эмоциональным, добавить конкретные примеры, убрать воду..."
            />
            <div className="flex items-center gap-3 justify-end">
              <Button
                onClick={() => {
                  setIsScriptPromptModalOpen(false)
                  setScriptPromptText('')
                }}
                variant="outline"
              >
                Отмена
              </Button>
              <Button
                onClick={() => handleRegenerateScript(scriptPromptText.trim() || undefined)}
                disabled={isRegeneratingScript}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRegeneratingScript ? 'animate-spin' : ''}`} />
                {isRegeneratingScript ? 'Запуск...' : 'Перегенерировать'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
