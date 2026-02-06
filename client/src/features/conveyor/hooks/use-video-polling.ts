/**
 * Хук для polling статуса генерации видео
 * ≤150 строк
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiRequest } from '@/shared/api/http'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'

interface UseVideoPollingReturn {
  status: 'pending' | 'processing' | 'completed' | 'failed' | null
  progress: number
  videoUrl: string | null
  error: string | null
  startPolling: (videoId: string) => void
  stopPolling: () => void
}

const POLL_INTERVAL = 30000 // 30 секунд (было 5 сек)
const MAX_ATTEMPTS = 40 // 20 минут (40 * 30 секунд)

export function useVideoPolling(scriptId: string): UseVideoPollingReturn {
  const [status, setStatus] = useState<
    'pending' | 'processing' | 'completed' | 'failed' | null
  >(null)
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<number | null>(null)
  const attemptsRef = useRef(0)
  const videoIdRef = useRef<string | null>(null)

  // Проверка статуса видео
  const checkStatus = useCallback(async () => {
    if (!videoIdRef.current) return

    attemptsRef.current++

    console.log(`📡 [useVideoPolling] Проверка статуса (попытка ${attemptsRef.current}/${MAX_ATTEMPTS})...`)

    if (attemptsRef.current > MAX_ATTEMPTS) {
      console.error(`⏰ [useVideoPolling] Превышен лимит попыток`)
      setError('Превышено время ожидания генерации (20 минут)')
      setStatus('failed')
      stopPolling()
      return
    }

    try {
      const response = await apiRequest(
        'GET',
        `/api/heygen/status/${videoIdRef.current}`
      )
      const data = await response.json()

      console.log(`📊 [useVideoPolling] Статус:`, data.status)

      // Обновление прогресса
      if (data.progress) {
        setProgress(data.progress)
      }

      // Обновление статуса
      setStatus(data.status)

      // Завершение
      if (data.status === 'completed') {
        console.log(`✅ [useVideoPolling] Видео готово!`)
        setVideoUrl(data.videoUrl)
        setProgress(100)

        // Сохранение в БД
        await scriptMediaService.updateVideo(scriptId, {
          videoUrl: data.videoUrl,
          videoStatus: 'completed',
          videoDuration: data.duration,
          videoThumbnailUrl: data.thumbnailUrl,
        })

        stopPolling()
      }

      // Ошибка
      if (data.status === 'failed' || data.status === 'error') {
        const errorMsg = data.error || data.error_message || 'Ошибка генерации'
        console.error(`❌ [useVideoPolling] Ошибка:`, errorMsg)
        setError(errorMsg)

        await scriptMediaService.updateVideo(scriptId, {
          videoStatus: 'failed',
          videoErrorMessage: errorMsg,
        })

        stopPolling()
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ошибка проверки статуса'
      console.error('❌ [useVideoPolling] Ошибка проверки статуса:', err)
      setError(message)
      setStatus('failed')
      stopPolling()
    }
  }, [scriptId])

  // Запуск polling
  const startPolling = useCallback(
    (videoId: string) => {
      console.log(`🎬 [useVideoPolling] Начинаем polling для видео ${videoId}, интервал: ${POLL_INTERVAL/1000}с`)
      
      videoIdRef.current = videoId
      attemptsRef.current = 0
      setStatus('processing')
      setProgress(0)
      setError(null)

      // Первая проверка сразу
      checkStatus()

      // Запуск интервала
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = window.setInterval(checkStatus, POLL_INTERVAL)
    },
    [checkStatus]
  )

  // Остановка polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      console.log(`🛑 [useVideoPolling] Остановка polling`)
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    videoIdRef.current = null
  }, [])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    status,
    progress,
    videoUrl,
    error,
    startPolling,
    stopPolling,
  }
}
