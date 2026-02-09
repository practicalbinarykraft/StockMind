/**
 * Утилита для polling статуса генерации видео HeyGen
 */

import { scriptMediaService } from '../services/scriptMediaService'
import { apiRequest } from '@/shared/api/http'

interface PollingCallbacks {
  onProgress?: (progress: number) => void
  onStatusChange?: (status: 'pending' | 'processing' | 'completed' | 'failed') => void
  onVideoReady?: (videoUrl: string) => void
  onError?: (error: string) => void
  onComplete?: () => void
  invalidateQueries?: () => void
}

/**
 * Запускает polling для проверки статуса генерации видео
 * @param videoId - ID видео в HeyGen
 * @param scriptId - ID скрипта в БД
 * @param callbacks - Колбеки для обновления состояния
 * @returns Promise с интервалом для возможности отмены
 */
export async function startVideoPolling(
  videoId: string,
  scriptId: string,
  callbacks: PollingCallbacks
): Promise<NodeJS.Timeout | null> {
  let attempts = 0
  const maxAttempts = 40 // 20 минут (40 * 30 секунд)
  const pollInterval = 30000 // 30 секунд между проверками

  console.log(`🎬 [startVideoPolling] Начинаем polling для видео ${videoId}, интервал: ${pollInterval / 1000}с`)

  const checkStatus = async (): Promise<boolean> => {
    attempts++
    console.log(`📡 [startVideoPolling] Проверка статуса (попытка ${attempts}/${maxAttempts})...`)

    if (attempts > maxAttempts) {
      const error = 'Превышено время ожидания генерации (20 минут)'
      console.error(`⏰ [startVideoPolling] ${error}`)
      callbacks.onError?.(error)
      throw new Error(error)
    }

    const statusResponse = await apiRequest('GET', `/api/heygen/status/${videoId}`)
    const rawResponse = await statusResponse.json()

    // HeyGen может возвращать { success, data: {...} } или просто {...}
    const statusData = rawResponse.data || rawResponse

    console.log(`📊 [startVideoPolling] Статус от HeyGen:`, statusData.status)

    // Обновление прогресса
    if (statusData.progress && callbacks.onProgress) {
      callbacks.onProgress(statusData.progress)
    }

    // Проверка статуса
    if (statusData.status === 'completed') {
      // HeyGen API возвращает video_url (snake_case)
      const videoUrl = statusData.video_url || statusData.videoUrl
      
      if (!videoUrl) {
        console.error('❌ [startVideoPolling] Данные от HeyGen:', statusData)
        throw new Error('Видео готово, но URL отсутствует')
      }

      console.log(`✅ [startVideoPolling] Видео готово! URL:`, videoUrl)

      // Сохранение результата
      await scriptMediaService.updateVideo(scriptId, {
        videoUrl: videoUrl,
        videoStatus: 'completed',
        videoDuration: statusData.duration,
        videoThumbnailUrl: statusData.thumbnail_url || statusData.thumbnailUrl,
      })

      callbacks.onVideoReady?.(videoUrl)
      callbacks.onStatusChange?.('completed')
      callbacks.onProgress?.(100)
      callbacks.invalidateQueries?.()
      callbacks.onComplete?.()

      return true
    }

    if (statusData.status === 'failed' || statusData.status === 'error') {
      const error =
        statusData.error_message ||
        statusData.error ||
        rawResponse.message ||
        'Ошибка генерации на стороне HeyGen'

      console.error(`❌ [startVideoPolling] Генерация не удалась:`, error)

      await scriptMediaService.updateVideo(scriptId, {
        videoStatus: 'failed',
        videoErrorMessage: error,
      })

      callbacks.onStatusChange?.('failed')
      callbacks.onError?.(error)
      callbacks.invalidateQueries?.()

      throw new Error(error)
    }

    // Продолжаем ожидание
    console.log(`⏳ [startVideoPolling] Генерация продолжается (${statusData.status})...`)
    return false
  }

  // Первая проверка сразу
  console.log(`🔍 [startVideoPolling] Немедленная проверка статуса...`)
  try {
    const isCompleted = await checkStatus()
    if (isCompleted) {
      console.log(`✅ [startVideoPolling] Видео уже готово!`)
      return null // Не нужен интервал
    }
  } catch (err) {
    console.error(`❌ [startVideoPolling] Ошибка при первой проверке:`, err)
    return null
  }

  // Polling с увеличенным интервалом
  const intervalId = setInterval(async () => {
    try {
      const isCompleted = await checkStatus()
      if (isCompleted) {
        console.log(`✅ [startVideoPolling] Polling завершен - видео готово`)
        clearInterval(intervalId)
      }
    } catch (err) {
      console.error(`❌ [startVideoPolling] Ошибка во время polling:`, err)
      clearInterval(intervalId)
    }
  }, pollInterval)

  return intervalId
}
