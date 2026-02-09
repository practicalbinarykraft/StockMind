/**
 * Хук для загрузки аудио файла
 * ≤150 строк
 */

import { useState, useCallback } from 'react'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'

interface UseAudioUploadReturn {
  audioUrl: string | null
  isUploading: boolean
  error: string | null
  upload: (file: File) => Promise<void>
  audioFilename: string | null
}

export function useAudioUpload(scriptId: string): UseAudioUploadReturn {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioFilename, setAudioFilename] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузка существующего аудио
  useState(() => {
    scriptMediaService
      .getMedia(scriptId)
      .then((media) => {
        // Показываем аудио только если это загруженный файл
        if (media?.audioUrl && media.audioMode === 'upload') {
          setAudioUrl(media.audioUrl)
          if (media.audioFilename) {
            setAudioFilename(media.audioFilename)
          }
        }
      })
      .catch(console.error)
  })

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true)
      setError(null)

      try {
        // Валидация файла
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-m4a', 'audio/mp4']
        const hasValidType = validTypes.includes(file.type) || file.name.match(/\.(mp3|wav|ogg|m4a)$/i)
        
        if (!hasValidType) {
          throw new Error('Поддерживаются форматы: MP3, WAV, OGG, M4A (макс. 50MB)')
        }

        const maxSize = 50 * 1024 * 1024 // 50MB
        if (file.size > maxSize) {
          throw new Error('Размер файла не должен превышать 50MB')
        }

        // Загрузка на сервер
        const formData = new FormData()
        formData.append('audio', file)
        formData.append('scriptId', scriptId)

        // Используем fetch напрямую для FormData (apiRequest не поддерживает FormData)
        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include', // Отправка httpOnly cookies
        })

        if (!response.ok) {
          // Пытаемся получить JSON ошибку, но если сервер вернул HTML, обрабатываем это
          let errorMessage = `HTTP ${response.status}`
          const contentType = response.headers.get('content-type')
          
          if (contentType?.includes('application/json')) {
            const errorData = await response.json().catch(() => ({}))
            errorMessage = errorData.message || errorMessage
          } else {
            // Сервер вернул не JSON (возможно HTML страницу ошибки)
            errorMessage = `Ошибка сервера (${response.status}). Проверьте, что роут /api/audio/upload доступен`
          }
          
          throw new Error(errorMessage)
        }

        const contentType = response.headers.get('content-type')
        
        if (!contentType?.includes('application/json')) {
          throw new Error('Сервер вернул некорректный ответ. Ожидался JSON.')
        }
        
        const data = await response.json()

        if (!data.audioUrl) {
          throw new Error('Не удалось получить URL загруженного файла')
        }

        // Сохранение в scripts_media
        await scriptMediaService.updateAudio(scriptId, {
          audioUrl: data.audioUrl,
          audioMode: 'upload',
          audioFilename: file.name,
          audioFilesize: file.size,
          audioGeneratedAt: new Date().toISOString(),
        })

        setAudioUrl(data.audioUrl)
        setAudioFilename(file.name)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Ошибка загрузки файла'
        setError(message)
        console.error('Audio upload error:', err)
      } finally {
        setIsUploading(false)
      }
    },
    [scriptId]
  )

  return {
    audioUrl,
    isUploading,
    error,
    upload,
    audioFilename,
  }
}
