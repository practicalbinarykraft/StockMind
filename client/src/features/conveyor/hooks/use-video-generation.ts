/**
 * Хук для генерации видео через HeyGen
 * ≤250 строк
 */

import { useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'
import { apiRequest } from '@/shared/api/http'
import { startVideoPolling } from '../utils/video-polling'
import { useToast } from '@/shared/hooks/use-toast'
import { useVideoFormatStore } from '../stores/useVideoFormatStore'

interface UseVideoGenerationReturn {
  isGenerating: boolean
  videoStatus: 'pending' | 'processing' | 'completed' | 'failed' | null
  videoProgress: number
  videoUrl: string | null
  videoId: string | null
  errorMessage: string | null
  generate: (
    avatarId: string,
    audioUrl: string,
    dimension?: { width: number; height: number }
  ) => Promise<void>
}

export function useVideoGeneration(
  scriptId: string
): UseVideoGenerationReturn {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { selectedQuality } = useVideoFormatStore()
  
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

  // Функция для запуска polling
  const startPolling = useCallback(
    async (currentVideoId: string) => {
      const intervalId = await startVideoPolling(currentVideoId, scriptId, {
        onProgress: (progress) => setVideoProgress(progress),
        onStatusChange: (status) => setVideoStatus(status),
        onVideoReady: (url) => setVideoUrl(url),
        onError: (error) => {
          setErrorMessage(error)
          setVideoStatus('failed')
          setIsGenerating(false)
          
          // Проверяем, если была попытка сгенерировать 1080p на бесплатном плане
          if (selectedQuality === '1080p' && error.toLowerCase().includes('resolution')) {
            toast({
              variant: 'destructive',
              title: 'Ошибка генерации видео',
              description: 'Для генерации видео в качестве 1080p требуется платная подписка HeyGen. Попробуйте выбрать качество 720p.',
            })
          } else if (selectedQuality === '1080p' && (error.toLowerCase().includes('plan') || error.toLowerCase().includes('subscription') || error.toLowerCase().includes('quota'))) {
            toast({
              variant: 'destructive',
              title: 'Ошибка генерации видео',
              description: 'Для генерации видео в качестве 1080p требуется платная подписка HeyGen. Попробуйте выбрать качество 720p.',
            })
          }
        },
        onComplete: () => {
          setIsGenerating(false)
          setPollingIntervalId(null)
        },
        invalidateQueries: () => {
          queryClient.invalidateQueries({ queryKey: ['script-media', scriptId] })
          queryClient.invalidateQueries({ queryKey: ['script-media-status', scriptId] })
        },
      })

      if (intervalId) {
        setPollingIntervalId(intervalId)
      } else {
        // Видео уже готово или ошибка при первой проверке
        setIsGenerating(false)
        setPollingIntervalId(null)
      }
    },
    [scriptId, queryClient]
  )

  // Загрузка существующего видео
  const loadExistingVideo = useCallback(async () => {
    try {
      const media = await scriptMediaService.getMedia(scriptId)
      
      console.log('📥 [useVideoGeneration] Загрузка существующих данных:', {
        videoId: media?.videoId,
        videoStatus: media?.videoStatus,
        hasVideoUrl: !!media?.videoUrl,
      })
      
      if (media?.videoUrl) {
        setVideoUrl(media.videoUrl)
      }
      if (media?.videoId) {
        setVideoId(media.videoId)
      }
      if (media?.videoStatus) {
        setVideoStatus(media.videoStatus as any)
        
        // Если видео в процессе генерации - запустить polling
        if (media.videoStatus === 'generating' && media.videoId) {
          console.log('🔄 [useVideoGeneration] Обнаружена активная генерация, запускаем polling...')
          setIsGenerating(true)
          
          // Запускаем polling с задержкой, чтобы дать возможность компонентам инициализироваться
          setTimeout(() => {
            startPolling(media.videoId!)
          }, 1000)
        }
      }
      if (media?.videoErrorMessage) {
        setErrorMessage(media.videoErrorMessage)
      }
    } catch (err) {
      console.error('❌ [useVideoGeneration] Ошибка загрузки существующего видео:', err)
    }
  }, [scriptId, startPolling])

  // Загрузка при монтировании
  useEffect(() => {
    loadExistingVideo()
  }, [loadExistingVideo])

  // Генерация видео
  const generate = useCallback(
    async (
      avatarId: string,
      audioUrl: string,
      dimension?: { width: number; height: number }
    ) => {
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
          dimension,
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

        // Шаг 3: Запуск polling статуса генерации
        console.log(`🎬 [generate] Запускаем polling для видео ${generateData.videoId}`)
        startPolling(generateData.videoId)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Ошибка генерации видео'
        setErrorMessage(message)
        setVideoStatus('failed')
        setIsGenerating(false)
        console.error('Video generation error:', err)
        
        // Проверяем, если была попытка сгенерировать 1080p на бесплатном плане
        if (selectedQuality === '1080p') {
          const errorText = message.toLowerCase()
          if (errorText.includes('resolution') || errorText.includes('plan') || 
              errorText.includes('subscription') || errorText.includes('quota') ||
              errorText.includes('dimension') || errorText.includes('1080')) {
            toast({
              variant: 'destructive',
              title: 'Ошибка генерации видео',
              description: 'Для генерации видео в качестве 1080p требуется платная подписка HeyGen. Попробуйте выбрать качество 720p.',
            })
          }
        }
      }
    },
    [scriptId, startPolling]
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
