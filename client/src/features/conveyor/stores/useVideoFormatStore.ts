/**
 * Zustand store для синхронизации формата видео между компонентами
 */

import { create } from 'zustand'
import { scriptMediaService } from '../services/scriptMediaService'

type VideoQuality = '720p' | '1080p'

interface VideoFormatState {
  // Состояние
  selectedFormat: '16:9' | '9:16' | '1:1'
  selectedQuality: VideoQuality
  videoDimension: { width: number; height: number }
  isLoading: boolean
  isInitialized: boolean
  currentScriptId: string | null

  // Действия
  initialize: (scriptId: string) => Promise<void>
  setFormat: (format: '16:9' | '9:16' | '1:1') => Promise<void>
  setQuality: (quality: VideoQuality) => Promise<void>
  reset: () => void
}

// Функция для вычисления dimension на основе формата и качества
function calculateDimension(format: '16:9' | '9:16' | '1:1', quality: VideoQuality): { width: number; height: number } {
  if (quality === '1080p') {
    switch (format) {
      case '16:9':
        return { width: 1920, height: 1080 }
      case '9:16':
        return { width: 1080, height: 1920 }
      case '1:1':
        return { width: 1080, height: 1080 }
    }
  } else {
    // 720p
    switch (format) {
      case '16:9':
        return { width: 1280, height: 720 }
      case '9:16':
        return { width: 720, height: 1280 }
      case '1:1':
        return { width: 720, height: 720 }
    }
  }
}

export const useVideoFormatStore = create<VideoFormatState>((set, get) => ({
  // Начальное состояние
  selectedFormat: '9:16',
  selectedQuality: '720p',
  videoDimension: { width: 720, height: 1280 },
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
      const media = await scriptMediaService.getMedia(scriptId)

      // Определяем качество из сохраненного dimension
      let quality: VideoQuality = '720p'
      if (media?.videoDimension) {
        const { width, height } = media.videoDimension
        const maxDimension = Math.max(width, height)
        quality = maxDimension > 1280 ? '1080p' : '720p'
      }

      // Устанавливаем формат
      if (media?.videoAspectRatio && media?.videoDimension) {
        // Есть сохранённый формат - используем его
        set({
          selectedFormat: media.videoAspectRatio,
          selectedQuality: quality,
          videoDimension: media.videoDimension,
          isLoading: false,
          isInitialized: true,
        })
        console.log('✅ Загружен сохранённый формат:', media.videoAspectRatio, media.videoDimension, quality)
      } else if (media?.videoUrl && !media?.videoAspectRatio) {
        // Старое видео без сохранённого формата - используем старый дефолт
        set({
          selectedFormat: '16:9',
          selectedQuality: '720p',
          videoDimension: { width: 1280, height: 720 },
          isLoading: false,
          isInitialized: true,
        })
        console.log('📼 Старое видео - используем дефолт 16:9 (1280×720)')
      } else {
        // Новое видео - дефолт 9:16 720p
        const defaultDimension = { width: 720, height: 1280 }

        set({
          selectedFormat: '9:16',
          selectedQuality: '720p',
          videoDimension: defaultDimension,
          isLoading: false,
          isInitialized: true,
        })
        console.log('🆕 Новое видео - дефолт 9:16 (720p)')

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
      console.error('Failed to load format:', err)
      set({ isLoading: false, isInitialized: true })
    }
  },

  // Изменение формата
  setFormat: async (format: '16:9' | '9:16' | '1:1') => {
    const { currentScriptId, selectedQuality } = get()
    
    if (!currentScriptId) {
      console.error('Cannot set format: scriptId not initialized')
      return
    }

    const dimension = calculateDimension(format, selectedQuality)

    // Немедленно обновляем локальный стейт
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

  // Изменение качества
  setQuality: async (quality: VideoQuality) => {
    const { currentScriptId, selectedFormat } = get()
    
    if (!currentScriptId) {
      console.error('Cannot set quality: scriptId not initialized')
      return
    }

    const dimension = calculateDimension(selectedFormat, quality)

    // Немедленно обновляем локальный стейт
    set({
      selectedQuality: quality,
      videoDimension: dimension,
    })

    // Сохранение в БД
    try {
      await scriptMediaService.updateVideo(currentScriptId, {
        videoAspectRatio: selectedFormat,
        videoDimension: dimension,
      })
      console.log(`✅ Сохранено качество: ${quality} (${dimension.width}×${dimension.height})`)
    } catch (err) {
      console.error('Failed to save quality:', err)
    }
  },

  // Сброс состояния
  reset: () => {
    set({
      selectedFormat: '9:16',
      selectedQuality: '720p',
      videoDimension: { width: 720, height: 1280 },
      isLoading: false,
      isInitialized: false,
      currentScriptId: null,
    })
  },
}))
