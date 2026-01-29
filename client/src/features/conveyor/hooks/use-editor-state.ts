import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { useToast } from '@/shared/hooks/use-toast'
import { scriptsService } from '../services/scriptsService'
import type { Script, Scene } from '../types'

interface UseEditorStateParams {
  scriptId: string
  initialScript: Script
}

interface UseEditorStateReturn {
  // Состояние
  currentData: Script
  savedData: Script
  isDirty: boolean
  isSaving: boolean
  isRegenerating: boolean
  selectedSceneId: string | null
  editingText: string
  
  // Действия
  setSelectedScene: (sceneId: string) => void
  handleEditScene: (text: string) => void
  handleSave: () => Promise<void>
  handleAutoSave: () => Promise<void>
  handleCancel: () => void
  handleCreateVersion: (type: 'draft' | 'ready') => Promise<void>
  handleAIRegenerate: (sceneId: string, prompt?: string, lengthOption?: string) => Promise<void>
  handleExit: () => Promise<void>
  
  // Recovery
  hasRecoverableCheckpoints: boolean
  checkpoints: Array<any>
  handleRestoreCheckpoint: (checkpointId: string) => Promise<void>
  dismissCheckpoints: () => void
}

// Debounce helper
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}

export function useEditorState(params: UseEditorStateParams): UseEditorStateReturn {
  const { scriptId, initialScript } = params
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  // Основное состояние
  const [currentData, setCurrentData] = useState<Script>(initialScript)
  const [savedData, setSavedData] = useState<Script>(initialScript)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  
  // UI состояние
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    initialScript.scenes[0]?.id || null
  )
  const [editingText, setEditingText] = useState<string>(
    initialScript.scenes[0]?.text || ''
  )
  
  // Recovery состояние
  const [hasRecoverableCheckpoints, setHasRecoverableCheckpoints] = useState(false)
  const [checkpoints, setCheckpoints] = useState<Array<any>>([])
  
  // Проверка checkpoint'ов при монтировании
  useEffect(() => {
    const checkRecovery = async () => {
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
  
  // Debounced operation log
  const debouncedLogOperation = useDebounce(
    async (data: { operationType: string; sceneId?: string; details?: any }) => {
      try {
        await scriptsService.logEditorOperation(scriptId, data)
      } catch (error) {
        console.error('Failed to log operation:', error)
      }
    },
    1000
  )
  
  // Выбор сцены
  const setSelectedScene = useCallback((sceneId: string) => {
    const scene = currentData.scenes.find(s => s.id === sceneId)
    if (scene) {
      setSelectedSceneId(sceneId)
      setEditingText(scene.text || '')
    }
  }, [currentData.scenes])
  
  // Редактирование сцены
  const handleEditScene = useCallback((text: string) => {
    if (!selectedSceneId) return
    
    setCurrentData(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => 
        s.id === selectedSceneId ? { ...s, text } : s
      )
    }))
    setEditingText(text)
    setIsDirty(true)
    
    // Debounced operation log
    const savedScene = savedData.scenes.find(s => s.id === selectedSceneId)
    debouncedLogOperation({
      operationType: 'scene_edit',
      sceneId: selectedSceneId,
      details: { 
        before: savedScene?.text, 
        after: text,
        timestamp: new Date().toISOString()
      }
    })
  }, [selectedSceneId, savedData, scriptId, debouncedLogOperation])
  
  // Сохранение (кнопка "Сохранить")
  const handleSave = useCallback(async () => {
    if (!isDirty) return
    
    setIsSaving(true)
    try {
      // Создать checkpoint перед сохранением
      if (isDirty) {
        await scriptsService.createCheckpoint(scriptId, {
          reason: 'auto',
          scenes: currentData.scenes,
          fullText: currentData.scenes.map(s => s.text).join('\n'),
          metadata: { 
            editingSceneId: selectedSceneId, 
            isDirty: true, 
            timestamp: new Date().toISOString() 
          }
        })
      }
      
      // Сохранить рабочее состояние
      const updatedScript = await scriptsService.saveWorkingState(scriptId, {
        scenes: currentData.scenes,
        fullText: currentData.scenes.map(s => s.text).join('\n'),
        editorState: { 
          lastEditedAt: new Date().toISOString(), 
          lastEditedSceneId: selectedSceneId 
        }
      })
      
      // Обновить savedData и сбросить dirty
      setSavedData(updatedScript)
      setCurrentData(updatedScript)
      setIsDirty(false)
      
      // Лог операции
      await scriptsService.logEditorOperation(scriptId, {
        operationType: 'save',
        details: { timestamp: new Date().toISOString() }
      })
      
      // Инвалидировать кэш
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      
      toast({ 
        title: 'Успешно', 
        description: 'Изменения сохранены' 
      })
    } catch (error: any) {
      console.error('Failed to save:', error)
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Не удалось сохранить изменения', 
        variant: 'destructive' 
      })
    } finally {
      setIsSaving(false)
    }
  }, [scriptId, currentData, savedData, isDirty, selectedSceneId, queryClient, toast])
  
  // Автосохранение
  const handleAutoSave = useCallback(async () => {
    if (!isDirty) return
    
    setIsSaving(true)
    try {
      // Создать checkpoint
      await scriptsService.createCheckpoint(scriptId, {
        reason: 'auto',
        scenes: currentData.scenes,
        fullText: currentData.scenes.map(s => s.text).join('\n'),
        metadata: { 
          editingSceneId: selectedSceneId, 
          isDirty: true, 
          timestamp: new Date().toISOString() 
        }
      })
      
      // Сохранить рабочее состояние
      const updatedScript = await scriptsService.saveWorkingState(scriptId, {
        scenes: currentData.scenes,
        fullText: currentData.scenes.map(s => s.text).join('\n'),
        editorState: { 
          lastEditedAt: new Date().toISOString(), 
          lastEditedSceneId: selectedSceneId 
        }
      })
      
      setSavedData(updatedScript)
      setCurrentData(updatedScript)
      setIsDirty(false)
      
      await scriptsService.logEditorOperation(scriptId, {
        operationType: 'auto_save',
        details: { timestamp: new Date().toISOString() }
      })
      
      toast({ 
        description: 'Изменения сохранены автоматически',
        duration: 2000 
      })
    } catch (error: any) {
      console.error('Failed to auto-save:', error)
    } finally {
      setIsSaving(false)
    }
  }, [scriptId, currentData, isDirty, selectedSceneId, toast])
  
  // Отмена изменений
  const handleCancel = useCallback(() => {
    setCurrentData(savedData)
    const scene = savedData.scenes.find(s => s.id === selectedSceneId)
    if (scene) setEditingText(scene.text || '')
    setIsDirty(false)
    
    scriptsService.logEditorOperation(scriptId, {
      operationType: 'cancel',
      details: { timestamp: new Date().toISOString() }
    }).catch(console.error)
  }, [savedData, selectedSceneId, scriptId])
  
  // Создание версии
  const handleCreateVersion = useCallback(async (type: 'draft' | 'ready') => {
    // Сначала сохранить если есть изменения
    if (isDirty) {
      await handleSave()
    }
    
    setIsSaving(true)
    try {
      // Создать новую версию
      await scriptsService.createLibraryScriptVersion(scriptId)
      
      // Инвалидировать кэш версий
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId, 'versions'] })
      
      await scriptsService.logEditorOperation(scriptId, {
        operationType: 'create_version',
        details: { type, timestamp: new Date().toISOString() }
      })
      
      toast({ 
        title: 'Успешно', 
        description: type === 'ready' ? 'Сценарий сохранён в готовые' : 'Новая версия создана' 
      })
      
      if (type === 'ready') {
        navigate('/conveyor/scripts')
      }
    } catch (error: any) {
      console.error('Failed to create version:', error)
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Не удалось создать версию', 
        variant: 'destructive' 
      })
    } finally {
      setIsSaving(false)
    }
  }, [scriptId, isDirty, handleSave, queryClient, navigate, toast])
  
  // AI перегенерация
  const handleAIRegenerate = useCallback(async (
    sceneId: string, 
    prompt?: string, 
    lengthOption?: string
  ) => {
    setIsRegenerating(true)
    try {
      // Checkpoint перед AI операцией
      if (isDirty) {
        await scriptsService.createCheckpoint(scriptId, {
          reason: 'pre_ai',
          scenes: currentData.scenes,
          fullText: currentData.scenes.map(s => s.text).join('\n'),
          metadata: { 
            editingSceneId: selectedSceneId, 
            isDirty: true, 
            timestamp: new Date().toISOString() 
          }
        })
      }
      
      const scene = currentData.scenes.find(s => s.id === sceneId)
      if (!scene) {
        throw new Error('Scene not found')
      }
      
      // AI генерация вариантов
      const result = await scriptsService.generateVariants({
        sourceText: scene.text || '',
        prompt,
        format: lengthOption === 'increase' ? 'long' : lengthOption === 'decrease' ? 'short' : 'base',
        lengthOption: (lengthOption || 'keep') as any,
      })
      
      // Обновить альтернативы в currentData
      setCurrentData(prev => ({
        ...prev,
        scenes: prev.scenes.map(s => {
          if (s.id === sceneId) {
            // Найти варианты для этой сцены
            const sceneIndex = prev.scenes.findIndex(sc => sc.id === sceneId)
            const sceneVariants = result.variants[sceneIndex] || []
            
            return { 
              ...s, 
              alternatives: sceneVariants.map(v => v.text)
            }
          }
          return s
        })
      }))
      setIsDirty(true)
      
      await scriptsService.logEditorOperation(scriptId, {
        operationType: 'ai_regenerate',
        sceneId,
        details: { prompt, lengthOption, timestamp: new Date().toISOString() }
      })
      
      const variantsCount = Object.values(result.variants).reduce(
        (sum, arr) => sum + arr.length, 
        0
      )
      
      toast({ 
        title: 'Успешно', 
        description: `Сгенерировано ${variantsCount} вариантов` 
      })
    } catch (error: any) {
      console.error('Failed to regenerate:', error)
      toast({ 
        title: 'Ошибка', 
        description: error.message || 'Не удалось перегенерировать', 
        variant: 'destructive' 
      })
    } finally {
      setIsRegenerating(false)
    }
  }, [scriptId, currentData, isDirty, selectedSceneId, toast])
  
  // Выход из редактора
  const handleExit = useCallback(async () => {
    if (isDirty) {
      // Создать checkpoint при выходе с несохранёнными изменениями
      try {
        await scriptsService.createCheckpoint(scriptId, {
          reason: 'exit',
          scenes: currentData.scenes,
          fullText: currentData.scenes.map(s => s.text).join('\n'),
          metadata: { 
            editingSceneId: selectedSceneId, 
            isDirty: true, 
            timestamp: new Date().toISOString() 
          }
        })
        
        await scriptsService.logEditorOperation(scriptId, {
          operationType: 'exit_with_unsaved',
          details: { timestamp: new Date().toISOString() }
        })
      } catch (error) {
        console.error('Failed to create exit checkpoint:', error)
      }
    }
  }, [scriptId, currentData, isDirty, selectedSceneId])
  
  // Восстановление из checkpoint
  const handleRestoreCheckpoint = useCallback(async (checkpointId: string) => {
    setIsSaving(true)
    try {
      const restoredScript = await scriptsService.restoreFromCheckpoint(scriptId, checkpointId)
      
      // Обновить состояние
      setCurrentData(restoredScript)
      setSavedData(restoredScript)
      setIsDirty(false)
      
      // Обновить выбранную сцену
      if (restoredScript.scenes.length > 0) {
        setSelectedSceneId(restoredScript.scenes[0].id)
        setEditingText(restoredScript.scenes[0].text || '')
      }
      
      // Скрыть баннер recovery
      setHasRecoverableCheckpoints(false)
      setCheckpoints([])
      
      // Инвалидировать кэш
      await queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      
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
  }, [scriptId, queryClient, toast])
  
  // Отклонить восстановление
  const dismissCheckpoints = useCallback(() => {
    setHasRecoverableCheckpoints(false)
    setCheckpoints([])
  }, [])
  
  // Cleanup при unmount
  useEffect(() => {
    return () => {
      handleExit()
    }
  }, [handleExit])
  
  return {
    currentData,
    savedData,
    isDirty,
    isSaving,
    isRegenerating,
    selectedSceneId,
    editingText,
    setSelectedScene,
    handleEditScene,
    handleSave,
    handleAutoSave,
    handleCancel,
    handleCreateVersion,
    handleAIRegenerate,
    handleExit,
    hasRecoverableCheckpoints,
    checkpoints,
    handleRestoreCheckpoint,
    dismissCheckpoints,
  }
}
