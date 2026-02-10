/**
 * Zustand store для синхронизации формата видео между компонентами
 */

import { create } from 'zustand'
import { scriptMediaService } from '../services/scriptMediaService'
import { apiRequest } from '@/shared/api/http'

interface VideoFormatState {
  // Состояние
  selectedFormat: '16:9' | '9:16' | '1:1'
  videoDimension: { width: number; height: number }
  userPlan: 'free' | 'paid'
  isLoading: boolean
  isInitialized: boolean
  currentScriptId: string | null

  // Действия
  initialize: (scriptId: string) => Promise<void>
  setFormat: (format: '16:9' | '9:16' | '1:1', dimension: { width: number; height: number }) => Promise<void>
  reset: () => void
}

export const useVideoFormatStore = create<VideoFormatState>((set, get) => ({
  // Начальное состояние
  selectedFormat: '9:16',
  videoDimension: { width: 720, height: 1280 },
  userPlan: 'free',
  isLoading: false,
  isInitialized: false,
  currentScriptId: null,

  // Инициализация store для конкретного scriptId
  initialize: async (scriptId: string) => {
    const state = get()
    
    // Если уже инициализирован для этого scriptId, не перезагружаем
    if (state.isInitialized && state.currentScriptId === scriptId) {
      return
    }

    set({ isLoading: true, currentScriptId: scriptId })

    try {
      // Параллельная загрузка медиа и плана
      const [media, quotaResponse] = await Promise.all([
        scriptMediaService.getMedia(scriptId),
        apiRequest('GET', '/api/heygen/quota').catch(() => null),
      ])

      // Определяем план пользователя
      let detectedPlan: 'free' | 'paid' = 'free'
      if (quotaResponse) {
        try {
          const quotaData = await quotaResponse.json()
          const isFreePlan = quotaData.data?.isFreePlan ?? true
          detectedPlan = isFreePlan ? 'free' : 'paid'
          console.log('📊 HeyGen план:', isFreePlan ? 'FREE' : 'PAID')
        } catch (err) {
          console.error('Failed to parse quota:', err)
        }
      }

      // Устанавливаем формат
      if (media?.videoAspectRatio && media?.videoDimension) {
        // Есть сохранённый формат - используем его
        set({
          selectedFormat: media.videoAspectRatio,
          videoDimension: media.videoDimension,
          userPlan: detectedPlan,
          isLoading: false,
          isInitialized: true,
        })
        console.log('✅ Загружен сохранённый формат:', media.videoAspectRatio, media.videoDimension)
      } else if (media?.videoUrl && !media?.videoAspectRatio) {
        // Старое видео без сохранённого формата - используем старый дефолт
        set({
          selectedFormat: '16:9',
          videoDimension: { width: 1280, height: 720 },
          userPlan: detectedPlan,
          isLoading: false,
          isInitialized: true,
        })
        console.log('📼 Старое видео - используем дефолт 16:9 (1280×720)')
      } else {
        // Новое видео - дефолт 9:16 (вертикальный формат)
        const defaultDimension = detectedPlan === 'paid'
          ? { width: 1080, height: 1920 }
          : { width: 720, height: 1280 }

        set({
          selectedFormat: '9:16',
          videoDimension: defaultDimension,
          userPlan: detectedPlan,
          isLoading: false,
          isInitialized: true,
        })
        console.log(`🆕 Новое видео (${detectedPlan.toUpperCase()} план) - дефолт 9:16`)

        // Сохраняем дефолтный формат в БД
        try {
          await scriptMediaService.updateVideo(scriptId, {
            videoAspectRatio: '9:16',
            videoDimension: defaultDimension,
          })
          console.log('💾 Сохранён дефолтный формат 9:16 в БД')
        } catch (err) {
          console.error('Failed to save default format:', err)
        }
      }
    } catch (err) {
      console.error('Failed to load format and plan:', err)
      set({ isLoading: false, isInitialized: true })
    }
  },

  // Изменение формата (синхронизируется между всеми компонентами)
  setFormat: async (format: '16:9' | '9:16' | '1:1', dimension: { width: number; height: number }) => {
    const { currentScriptId } = get()
    
    if (!currentScriptId) {
      console.error('Cannot set format: scriptId not initialized')
      return
    }

    // Немедленно обновляем локальный стейт для мгновенного UI отклика
    set({
      selectedFormat: format,
      videoDimension: dimension,
    })

    // Сохранение в БД
    try {
      await scriptMediaService.updateVideo(currentScriptId, {
        videoAspectRatio: format,
        videoDimension: dimension,
      })
      console.log(`✅ Сохранён формат: ${format} (${dimension.width}×${dimension.height})`)
    } catch (err) {
      console.error('Failed to save format:', err)
    }
  },

  // Сброс состояния
  reset: () => {
    set({
      selectedFormat: '9:16',
      videoDimension: { width: 720, height: 1280 },
      userPlan: 'free',
      isLoading: false,
      isInitialized: false,
      currentScriptId: null,
    })
  },
}))
