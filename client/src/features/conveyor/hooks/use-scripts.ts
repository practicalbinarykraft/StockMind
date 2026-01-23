/**
 * Хуки для работы со сценариями
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { scriptsService, type SSEEvent } from '../services/scriptsService'
import { useToast } from '@/shared/hooks/use-toast'
import { queryClient } from '@/shared/api'

/**
 * Хук для получения списка черновиков
 */
export function useDrafts(params?: {
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['scripts', 'draft', params],
    queryFn: () => scriptsService.getDrafts(params),
  })
}

/**
 * Хук для получения списка сценариев
 */
export function useScripts(params?: {
  status?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['scripts', params],
    queryFn: () => scriptsService.getScripts(params),
  })
}

/**
 * Хук для получения одного сценария
 */
export function useScript(id: string) {
  return useQuery({
    queryKey: ['scripts', id],
    queryFn: () => scriptsService.getScript(id),
    enabled: !!id,
  })
}

/**
 * Хук для получения итераций сценария
 */
export function useScriptIterations(id: string) {
  return useQuery({
    queryKey: ['scripts', id, 'iterations'],
    queryFn: () => scriptsService.getScriptIterations(id),
    enabled: !!id,
  })
}

/**
 * Хук для получения настроек AI
 */
export function useAISettings() {
  return useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => scriptsService.getAISettings(),
  })
}

/**
 * Хук для подписки на SSE события генерации
 */
export function useScriptGeneration(scriptId: string) {
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!scriptId) return

    setIsConnected(true)
    setError(null)

    const unsubscribe = scriptsService.subscribeToGeneration(
      scriptId,
      (event) => {
        setEvents((prev) => [...prev, event])
      },
      (err) => {
        setError(err)
        setIsConnected(false)
      }
    )

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [scriptId])

  return {
    events,
    isConnected,
    error,
  }
}

/**
 * Хук для мутаций сценариев
 */
export function useScriptActions() {
  const { toast } = useToast()

  // Запустить генерацию
  const startGeneration = useMutation({
    mutationFn: (newsId: string) => scriptsService.startGeneration(newsId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      toast({
        title: 'Генерация запущена',
        description: data.message,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка запуска генерации',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Остановить генерацию
  const stopGeneration = useMutation({
    mutationFn: (scriptId: string) => scriptsService.stopGeneration(scriptId),
    onSuccess: (_, scriptId) => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      toast({
        title: 'Генерация остановлена',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Перезапустить генерацию
  const retryGeneration = useMutation({
    mutationFn: (scriptId: string) => scriptsService.retryGeneration(scriptId),
    onSuccess: (_, scriptId) => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['scripts', scriptId] })
      toast({
        title: 'Генерация перезапущена',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Обновить статус сценария
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      scriptsService.updateScriptStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['scripts', data.id] })
      toast({
        title: 'Статус обновлен',
        description: status === 'approved' ? 'Сценарий одобрен' : 'Сценарий отклонен',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Удалить сценарий
  const deleteScript = useMutation({
    mutationFn: (id: string) => scriptsService.deleteScript(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      toast({
        title: 'Сценарий удален',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка удаления',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return {
    startGeneration,
    stopGeneration,
    retryGeneration,
    updateStatus,
    deleteScript,
  }
}

/**
 * Хук для мутаций настроек AI
 */
export function useAISettingsActions() {
  const { toast } = useToast()

  // Обновить настройки
  const updateSettings = useMutation({
    mutationFn: (settings: Partial<any>) => scriptsService.updateAISettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      toast({
        title: 'Настройки сохранены',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка сохранения',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Добавить пример
  const addExample = useMutation({
    mutationFn: (example: { filename: string; content: string }) =>
      scriptsService.addExample(example),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      toast({
        title: 'Пример добавлен',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Удалить пример
  const deleteExample = useMutation({
    mutationFn: (exampleId: string) => scriptsService.deleteExample(exampleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      toast({
        title: 'Пример удален',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Сохранить API ключ
  const saveApiKey = useMutation({
    mutationFn: ({ provider, apiKey }: { provider: 'anthropic' | 'deepseek'; apiKey: string }) =>
      scriptsService.saveApiKey(provider, apiKey),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      toast({
        title: 'API ключ сохранен',
        description: `Провайдер: ${data.provider}, последние 4 символа: ${data.last4}`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Удалить API ключ
  const deleteApiKey = useMutation({
    mutationFn: (provider: 'anthropic' | 'deepseek') => scriptsService.deleteApiKey(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      toast({
        title: 'API ключ удален',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Протестировать API ключ
  const testApiKey = useMutation({
    mutationFn: (provider: 'anthropic' | 'deepseek') => scriptsService.testApiKey(provider),
    onSuccess: (data) => {
      toast({
        title: data.success ? 'Ключ работает' : 'Ошибка теста',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка теста',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  return {
    updateSettings,
    addExample,
    deleteExample,
    saveApiKey,
    deleteApiKey,
    testApiKey,
  }
}
