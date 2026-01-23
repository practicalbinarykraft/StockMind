/**
 * Хуки для работы с новостями
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import { newsService } from '../services/newsService'
import { useToast } from '@/shared/hooks/use-toast'
import { queryClient } from '@/shared/api'

/**
 * Хук для получения списка новостей
 */
export function useNews(params?: {
  status?: string
  source?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['news', params],
    queryFn: () => newsService.getNews(params),
  })
}

/**
 * Хук для получения одной новости
 */
export function useNewsItem(id: string) {
  return useQuery({
    queryKey: ['news', id],
    queryFn: () => newsService.getNewsItem(id),
    enabled: !!id,
  })
}

/**
 * Хук для получения RSS источников
 */
export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => newsService.getSources(),
  })
}

/**
 * Хук для мутаций новостей
 */
export function useNewsActions() {
  const { toast } = useToast()

  // Обновить RSS фиды
  const refreshNews = useMutation({
    mutationFn: newsService.refreshNews,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      toast({
        title: 'Новости обновлены',
        description: `Добавлено новых новостей: ${data.added}`,
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

  // Проскорить новость
  const scoreNews = useMutation({
    mutationFn: (id: string) => newsService.scoreNews(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      queryClient.invalidateQueries({ queryKey: ['news', id] })
      toast({
        title: 'Новость проанализирована',
        description: `Оценка: ${data.score}/10`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка анализа',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Проскорить все новости
  const scoreAllNews = useMutation({
    mutationFn: newsService.scoreAllNews,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      toast({
        title: 'Анализ завершен',
        description: `Проанализировано новостей: ${data.scored}`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка анализа',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Обновить статус новости
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'selected' | 'dismissed' }) =>
      newsService.updateNewsStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      queryClient.invalidateQueries({ queryKey: ['news', data.id] })
      toast({
        title: 'Статус обновлен',
        description: status === 'selected' ? 'Новость отмечена как выбранная' : 'Новость отклонена',
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

  // Удалить новость
  const deleteNews = useMutation({
    mutationFn: (id: string) => newsService.deleteNews(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      toast({
        title: 'Новость удалена',
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
    refreshNews,
    scoreNews,
    scoreAllNews,
    updateStatus,
    deleteNews,
  }
}

/**
 * Хук для мутаций RSS источников
 */
export function useSourceActions() {
  const { toast } = useToast()

  // Добавить источник
  const addSource = useMutation({
    mutationFn: (source: { name: string; url: string }) => newsService.addSource(source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast({
        title: 'Источник добавлен',
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

  // Обновить источник
  const updateSource = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
      newsService.updateSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast({
        title: 'Источник обновлен',
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

  // Удалить источник
  const deleteSource = useMutation({
    mutationFn: (id: string) => newsService.deleteSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast({
        title: 'Источник удален',
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

  return {
    addSource,
    updateSource,
    deleteSource,
  }
}
