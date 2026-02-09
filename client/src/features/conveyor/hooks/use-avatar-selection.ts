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
  myAvatars: Avatar[] // Мои аватары
  publicAvatars: Avatar[] // Публичные аватары
  selectedAvatarId: string | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  setSelectedAvatarId: (id: string) => void
  refreshAvatars: () => Promise<void>
}

const AVATARS_PER_PAGE = 12

export function useAvatarSelection(
  scriptId: string
): UseAvatarSelectionReturn {
  const [myAvatars, setMyAvatars] = useState<Avatar[]>([])
  const [publicAvatars, setPublicAvatars] = useState<Avatar[]>([])
  const [allMyAvatars, setAllMyAvatars] = useState<Avatar[]>([]) // Все "мои" без фильтра
  const [allPublicAvatars, setAllPublicAvatars] = useState<Avatar[]>([]) // Все "публичные" без фильтра
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Загрузка аватаров с сервера
  const loadAvatars = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Запрашиваем все аватары с большим лимитом
      const response = await apiRequest('GET', '/api/heygen/avatars?page=0&limit=1400')
      const data = await response.json()

      if (!data.avatars || !Array.isArray(data.avatars)) {
        throw new Error('Некорректный формат данных')
      }

      // ВРЕМЕННО: Добавляем моковые "мои аватары" для тестирования UI (14 штук)
      const mockMyAvatars: Avatar[] = [
        {
          avatar_id: 'mock_custom_avatar_1',
          avatar_name: 'Мой Тестовый Аватар 1',
          preview_image_url: 'https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=My+Avatar+1',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_2',
          avatar_name: 'Мой Тестовый Аватар 2',
          preview_image_url: 'https://via.placeholder.com/400x400/7C3AED/FFFFFF?text=My+Avatar+2',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_3',
          avatar_name: 'Мой Тестовый Аватар 3',
          preview_image_url: 'https://via.placeholder.com/400x400/2563EB/FFFFFF?text=My+Avatar+3',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_4',
          avatar_name: 'Мой Тестовый Аватар 4',
          preview_image_url: 'https://via.placeholder.com/400x400/059669/FFFFFF?text=My+Avatar+4',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_5',
          avatar_name: 'Мой Тестовый Аватар 5',
          preview_image_url: 'https://via.placeholder.com/400x400/DC2626/FFFFFF?text=My+Avatar+5',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_6',
          avatar_name: 'Мой Тестовый Аватар 6',
          preview_image_url: 'https://via.placeholder.com/400x400/EA580C/FFFFFF?text=My+Avatar+6',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_7',
          avatar_name: 'Мой Тестовый Аватар 7',
          preview_image_url: 'https://via.placeholder.com/400x400/CA8A04/FFFFFF?text=My+Avatar+7',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_8',
          avatar_name: 'Мой Тестовый Аватар 8',
          preview_image_url: 'https://via.placeholder.com/400x400/16A34A/FFFFFF?text=My+Avatar+8',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_9',
          avatar_name: 'Мой Тестовый Аватар 9',
          preview_image_url: 'https://via.placeholder.com/400x400/0891B2/FFFFFF?text=My+Avatar+9',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_10',
          avatar_name: 'Мой Тестовый Аватар 10',
          preview_image_url: 'https://via.placeholder.com/400x400/4338CA/FFFFFF?text=My+Avatar+10',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_11',
          avatar_name: 'Мой Тестовый Аватар 11',
          preview_image_url: 'https://via.placeholder.com/400x400/9333EA/FFFFFF?text=My+Avatar+11',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_12',
          avatar_name: 'Мой Тестовый Аватар 12',
          preview_image_url: 'https://via.placeholder.com/400x400/DB2777/FFFFFF?text=My+Avatar+12',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_13',
          avatar_name: 'Мой Тестовый Аватар 13',
          preview_image_url: 'https://via.placeholder.com/400x400/E11D48/FFFFFF?text=My+Avatar+13',
          preview_video_url: undefined,
          is_public: false,
        },
        {
          avatar_id: 'mock_custom_avatar_14',
          avatar_name: 'Мой Тестовый Аватар 14',
          preview_image_url: 'https://via.placeholder.com/400x400/0D9488/FFFFFF?text=My+Avatar+14',
          preview_video_url: undefined,
          is_public: false,
        },
      ]

      // Разделяем на "мои" и "публичные"
      const allMy = [...mockMyAvatars, ...data.avatars.filter((a: Avatar) => !a.is_public)]
      const allPublic = data.avatars.filter((a: Avatar) => a.is_public)

      // Сортируем по имени
      const sortByName = (avatars: Avatar[]) => 
        [...avatars].sort((a, b) => a.avatar_name.localeCompare(b.avatar_name))

      // Сохраняем ВСЕ аватары без фильтрации
      setAllMyAvatars(sortByName(allMy))
      setAllPublicAvatars(sortByName(allPublic))

      // Устанавливаем начальные отфильтрованные данные
      setMyAvatars(sortByName(allMy))
      setPublicAvatars(sortByName(allPublic))
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ошибка загрузки аватаров'
      setError(message)
      console.error('Avatars loading error:', err)
    } finally {
      setIsLoading(false)
    }
  }, []) // Убрали searchQuery из зависимостей

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

  // Фильтрация по поисковому запросу (локально, без запроса к серверу)
  useEffect(() => {
    const filterAvatars = (avatars: Avatar[]) => {
      if (!searchQuery.trim()) {
        return avatars
      }

      const query = searchQuery.toLowerCase()
      return avatars.filter((avatar) =>
        avatar.avatar_name.toLowerCase().includes(query)
      )
    }

    setMyAvatars(filterAvatars(allMyAvatars))
    setPublicAvatars(filterAvatars(allPublicAvatars))
  }, [searchQuery, allMyAvatars, allPublicAvatars])

  // Обновление списка
  const refreshAvatars = useCallback(async () => {
    await loadAvatars()
  }, [loadAvatars])

  return {
    myAvatars,
    publicAvatars,
    selectedAvatarId,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    setSelectedAvatarId,
    refreshAvatars,
  }
}
