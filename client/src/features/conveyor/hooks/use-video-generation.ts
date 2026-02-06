/**
 * Хук для генерации видео через HeyGen
 * ≤250 строк
 */

import { useState, useCallback, useEffect } from 'react'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'
import { apiRequest } from '@/shared/api/http'

interface UseVideoGenerationReturn {
  isGenerating: boolean
  videoStatus: 'pending' | 'processing' | 'completed' | 'failed' | null
  videoProgress: number
  videoUrl: string | null
  videoId: string | null
  errorMessage: string | null
  generate: (avatarId: string, audioUrl: string) => Promise<void>
}

export function useVideoGeneration(
  scriptId: string
): UseVideoGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [videoStatus, setVideoStatus] = useState<
    'pending' | 'processing' | 'completed' | 'failed' | null
  >(null)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Загрузка существующего видео
  const loadExistingVideo = useCallback(async () => {
    try {
      const media = await scriptMediaService.getMedia(scriptId)
      if (media?.videoUrl) {
        setVideoUrl(media.videoUrl)
        setVideoStatus('completed')
      }
      if (media?.videoId) {
        setVideoId(media.videoId)
      }
      if (media?.videoStatus) {
        setVideoStatus(media.videoStatus as any)
      }
      if (media?.videoErrorMessage) {
        setErrorMessage(media.videoErrorMessage)
      }
    } catch (err) {
      console.error('Failed to load existing video:', err)
    }
  }, [scriptId])

  // Загрузка при монтировании
  useEffect(() => {
    loadExistingVideo()
  }, [loadExistingVideo])

  // Генерация видео
  const generate = useCallback(
    async (avatarId: string, audioUrl: string) => {
      setIsGenerating(true)
      setVideoStatus('pending')
      setVideoProgress(0)
      setErrorMessage(null)

      try {
        // Шаг 1: Запуск генерации на HeyGen
        setVideoStatus('processing')
        const generateResponse = await apiRequest('POST', '/api/heygen/generate', {
          avatarId,
          audioUrl,
          scriptId,
        })

        const generateData = await generateResponse.json()

        if (!generateData.videoId) {
          throw new Error('Не удалось получить ID видео')
        }

        setVideoId(generateData.videoId)

        // Сохранение начального статуса в БД
        await scriptMediaService.updateVideo(scriptId, {
          videoId: generateData.videoId,
          selectedAvatar: avatarId,
          videoStatus: 'generating',
          videoGeneratedAt: new Date().toISOString(),
        })

        // Шаг 2: Polling статуса генерации
        let attempts = 0
        const maxAttempts = 120 // 10 минут (120 * 5 секунд)

        const checkStatus = async (): Promise<boolean> => {
          attempts++

          if (attempts > maxAttempts) {
            throw new Error('Превышено время ожидания генерации')
          }

          const statusResponse = await apiRequest(
            'GET',
            `/api/heygen/status/${generateData.videoId}`
          )
          const statusData = await statusResponse.json()

          // Обновление прогресса
          if (statusData.progress) {
            setVideoProgress(statusData.progress)
          }

          // Проверка статуса
          if (statusData.status === 'completed') {
            if (!statusData.videoUrl) {
              throw new Error('Видео готово, но URL отсутствует')
            }

            // Сохранение результата
            await scriptMediaService.updateVideo(scriptId, {
              videoUrl: statusData.videoUrl,
              videoStatus: 'completed',
              videoDuration: statusData.duration,
              videoThumbnailUrl: statusData.thumbnailUrl,
            })

            setVideoUrl(statusData.videoUrl)
            setVideoStatus('completed')
            setVideoProgress(100)
            return true
          }

          if (statusData.status === 'failed' || statusData.status === 'error') {
            const error = statusData.error || 'Ошибка генерации на стороне HeyGen'
            
            await scriptMediaService.updateVideo(scriptId, {
              videoStatus: 'failed',
              videoErrorMessage: error,
            })

            throw new Error(error)
          }

          // Продолжаем ожидание
          return false
        }

        // Polling с интервалом 5 секунд
        const pollInterval = setInterval(async () => {
          try {
            const isCompleted = await checkStatus()
            if (isCompleted) {
              clearInterval(pollInterval)
              setIsGenerating(false)
            }
          } catch (err) {
            clearInterval(pollInterval)
            throw err
          }
        }, 5000)

        // Первая проверка сразу
        const isCompleted = await checkStatus()
        if (isCompleted) {
          clearInterval(pollInterval)
          setIsGenerating(false)
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Ошибка генерации видео'
        setErrorMessage(message)
        setVideoStatus('failed')
        setIsGenerating(false)
        console.error('Video generation error:', err)
      }
    },
    [scriptId]
  )

  return {
    isGenerating,
    videoStatus,
    videoProgress,
    videoUrl,
    videoId,
    errorMessage,
    generate,
  }
}
