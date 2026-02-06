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
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null)

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        console.log('🧹 Очистка polling интервала при unmount')
        clearInterval(pollingIntervalId)
      }
    }
  }, [pollingIntervalId])

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
        // Шаг 1: Получаем текст скрипта из БД (нужен для HeyGen API)
        const media = await scriptMediaService.getMedia(scriptId)
        
        // Получаем скрипт через API
        let scriptText = ''
        try {
          const scriptResponse = await apiRequest('GET', `/api/scripts/${scriptId}`)
          const scriptData = await scriptResponse.json()
          const script = scriptData.data || scriptData
          
          // Извлекаем текст из сцен или fullText
          if (script.fullText) {
            scriptText = script.fullText
          } else if (script.scenes && Array.isArray(script.scenes)) {
            scriptText = script.scenes.map((s: any) => s.text).join('\n\n')
          } else {
            throw new Error('Текст скрипта не найден')
          }
        } catch (err) {
          console.error('Ошибка получения скрипта:', err)
          throw new Error('Не удалось загрузить текст скрипта')
        }

        if (!scriptText) {
          throw new Error('Текст скрипта пустой')
        }

        // Шаг 2: Запуск генерации на HeyGen
        setVideoStatus('processing')
        const generateResponse = await apiRequest('POST', '/api/heygen/generate', {
          avatarId,
          script: scriptText,
          audioUrl,
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

        // Шаг 3: Polling статуса генерации (УВЕЛИЧЕН ИНТЕРВАЛ)
        let attempts = 0
        const maxAttempts = 40 // 20 минут (40 * 30 секунд)
        const pollInterval = 30000 // 30 секунд между проверками (было 5 сек)

        console.log(`🎬 Начинаем polling для видео ${generateData.videoId}, интервал: ${pollInterval/1000}с`)

        const checkStatus = async (): Promise<boolean> => {
          attempts++
          console.log(`📡 Проверка статуса (попытка ${attempts}/${maxAttempts})...`)

          if (attempts > maxAttempts) {
            console.error(`⏰ Превышен лимит попыток (${maxAttempts})`)
            throw new Error('Превышено время ожидания генерации (20 минут)')
          }

          const statusResponse = await apiRequest(
            'GET',
            `/api/heygen/status/${generateData.videoId}`
          )
          const rawResponse = await statusResponse.json()
          
          // HeyGen может возвращать { success, data: {...} } или просто {...}
          const statusData = rawResponse.data || rawResponse

          console.log(`📊 Полный ответ от HeyGen:`, rawResponse)
          console.log(`📊 Статус от HeyGen:`, statusData.status)

          // Обновление прогресса
          if (statusData.progress) {
            setVideoProgress(statusData.progress)
          }

          // Проверка статуса
          if (statusData.status === 'completed') {
            if (!statusData.videoUrl) {
              throw new Error('Видео готово, но URL отсутствует')
            }

            console.log(`✅ Видео готово! URL:`, statusData.videoUrl)

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
            const error = statusData.error_message || statusData.error || rawResponse.message || 'Ошибка генерации на стороне HeyGen'
            
            console.error(`❌ Генерация не удалась:`, error)
            console.error(`❌ Детали ошибки:`, statusData)

            await scriptMediaService.updateVideo(scriptId, {
              videoStatus: 'failed',
              videoErrorMessage: error,
            })

            throw new Error(error)
          }

          // Продолжаем ожидание
          console.log(`⏳ Генерация продолжается (${statusData.status})...`)
          return false
        }

        // Первая проверка сразу
        console.log(`🔍 Немедленная проверка статуса...`)
        const isCompletedImmediately = await checkStatus()
        if (isCompletedImmediately) {
          console.log(`✅ Видео уже готово!`)
          setIsGenerating(false)
          return
        }

        // Polling с увеличенным интервалом
        const intervalId = setInterval(async () => {
          try {
            const isCompleted = await checkStatus()
            if (isCompleted) {
              console.log(`✅ Polling завершен - видео готово`)
              clearInterval(intervalId)
              setPollingIntervalId(null)
              setIsGenerating(false)
            }
          } catch (err) {
            console.error(`❌ Ошибка во время polling:`, err)
            clearInterval(intervalId)
            setPollingIntervalId(null)
            throw err
          }
        }, pollInterval)

        // Сохраняем ID интервала для cleanup
        setPollingIntervalId(intervalId)
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
