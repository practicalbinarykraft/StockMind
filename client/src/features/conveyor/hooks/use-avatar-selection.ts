/**
 * Хук для выбора аватара и работы со списком аватаров
 * ≤200 строк
 */

import { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '@/shared/api/http'

interface Avatar {
  avatar_id: string
  avatar_name: string
  preview_image_url?: string
  preview_video_url?: string
  is_public?: boolean
}

interface UseAvatarSelectionReturn {
  avatars: Avatar[]
  selectedAvatarId: string | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  currentPage: number
  totalPages: number
  setSearchQuery: (query: string) => void
  setSelectedAvatarId: (id: string) => void
  setCurrentPage: (page: number) => void
  refreshAvatars: () => Promise<void>
}

const AVATARS_PER_PAGE = 12

export function useAvatarSelection(
  scriptId: string
): UseAvatarSelectionReturn {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [allAvatars, setAllAvatars] = useState<Avatar[]>([])
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Загрузка аватаров с сервера
  const loadAvatars = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Запрашиваем все аватары с большим лимитом
      const response = await apiRequest('GET', '/api/heygen/avatars?page=0&limit=1000')
      const data = await response.json()

      if (!data.avatars || !Array.isArray(data.avatars)) {
        throw new Error('Некорректный формат данных')
      }

      setAllAvatars(data.avatars)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ошибка загрузки аватаров'
      setError(message)
      console.error('Avatars loading error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Загрузка сохранённого выбора
  const loadSavedSelection = useCallback(async () => {
    try {
      const response = await apiRequest(
        'GET',
        `/api/scripts/${scriptId}/media`
      )
      const data = await response.json()

      if (data?.selectedAvatar) {
        setSelectedAvatarId(data.selectedAvatar)
      }
    } catch (err) {
      console.error('Failed to load saved avatar:', err)
    }
  }, [scriptId])

  // Первоначальная загрузка
  useEffect(() => {
    loadAvatars()
    loadSavedSelection()
  }, [loadAvatars, loadSavedSelection])

  // Фильтрация, сортировка и пагинация
  useEffect(() => {
    let filtered = allAvatars

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((avatar) =>
        avatar.avatar_name.toLowerCase().includes(query)
      )
    }

    // Сортировка: сначала "мои аватары" (!is_public), затем публичные (is_public)
    const sorted = [...filtered].sort((a, b) => {
      const aIsPublic = a.is_public ?? true // По умолчанию считаем публичными
      const bIsPublic = b.is_public ?? true
      
      // Мои аватары (is_public === false) идут первыми
      if (!aIsPublic && bIsPublic) return -1
      if (aIsPublic && !bIsPublic) return 1
      
      // Внутри каждой группы сортируем по имени
      return a.avatar_name.localeCompare(b.avatar_name)
    })

    // Пагинация
    const startIndex = (currentPage - 1) * AVATARS_PER_PAGE
    const endIndex = startIndex + AVATARS_PER_PAGE
    const paginated = sorted.slice(startIndex, endIndex)

    setAvatars(paginated)
  }, [allAvatars, searchQuery, currentPage])

  // Вычисление общего количества страниц
  const totalPages = Math.ceil(
    (searchQuery.trim()
      ? allAvatars.filter((a) =>
          a.avatar_name.toLowerCase().includes(searchQuery.toLowerCase())
        ).length
      : allAvatars.length) / AVATARS_PER_PAGE
  )

  // Сброс страницы при изменении поиска
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Обновление списка
  const refreshAvatars = useCallback(async () => {
    await loadAvatars()
  }, [loadAvatars])

  return {
    avatars,
    selectedAvatarId,
    isLoading,
    error,
    searchQuery,
    currentPage,
    totalPages: totalPages || 1,
    setSearchQuery,
    setSelectedAvatarId,
    setCurrentPage,
    refreshAvatars,
  }
}
