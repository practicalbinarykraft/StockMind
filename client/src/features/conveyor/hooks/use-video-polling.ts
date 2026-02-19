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

  const stopPollingImpl = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    videoIdRef.current = null
  }, [])

  const stopPollingRef = useRef(stopPollingImpl)
  stopPollingRef.current = stopPollingImpl

  const checkStatus = useCallback(async () => {
    if (!videoIdRef.current) return

    attemptsRef.current++

    if (attemptsRef.current > MAX_ATTEMPTS) {
      setError('Превышено время ожидания генерации (20 минут)')
      setStatus('failed')
      stopPollingRef.current()
      return
    }

    try {
      const response = await apiRequest(
        'GET',
        `/api/heygen/status/${videoIdRef.current}`
      )
      const rawData = await response.json()
      const data = rawData.data || rawData

      if (data.progress) {
        setProgress(data.progress)
      }

      setStatus(data.status)

      if (data.status === 'completed') {
        setVideoUrl(data.videoUrl)
        setProgress(100)

        await scriptMediaService.updateVideo(scriptId, {
          videoUrl: data.videoUrl,
          videoStatus: 'completed',
          videoDuration: data.duration,
          videoThumbnailUrl: data.thumbnailUrl,
        })

        stopPollingRef.current()
      }

      if (data.status === 'failed' || data.status === 'error') {
        const errorMsg = data.error_message || data.error || rawData.message || 'Ошибка генерации'
        setError(errorMsg)

        await scriptMediaService.updateVideo(scriptId, {
          videoStatus: 'failed',
          videoErrorMessage: errorMsg,
        })

        stopPollingRef.current()
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ошибка проверки статуса'
      console.error('[useVideoPolling] Ошибка проверки статуса:', err)
      setError(message)
      setStatus('failed')
      stopPollingRef.current()
    }
  }, [scriptId])

  const startPolling = useCallback(
    (videoId: string) => {
      videoIdRef.current = videoId
      attemptsRef.current = 0
      setStatus('processing')
      setProgress(0)
      setError(null)

      checkStatus()

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      intervalRef.current = window.setInterval(checkStatus, POLL_INTERVAL)
    },
    [checkStatus]
  )

  const stopPolling = stopPollingImpl

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
