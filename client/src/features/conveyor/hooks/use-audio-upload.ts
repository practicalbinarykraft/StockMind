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
}

export function useAudioUpload(scriptId: string): UseAudioUploadReturn {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загрузка существующего аудио
  useState(() => {
    scriptMediaService
      .getMedia(scriptId)
      .then((media) => {
        if (media?.audioUrl) {
          setAudioUrl(media.audioUrl)
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
        if (!file.type.startsWith('audio/')) {
          throw new Error('Выбранный файл не является аудио')
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
        const response = await fetch('/api/upload/audio', {
          method: 'POST',
          body: formData,
          credentials: 'include', // Отправка httpOnly cookies
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Ошибка загрузки' }))
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const data = await response.json()

        if (!data.url) {
          throw new Error('Не удалось получить URL загруженного файла')
        }

        // Сохранение в scripts_media
        await scriptMediaService.updateAudio(scriptId, {
          audioUrl: data.url,
          audioMode: 'upload',
          audioFilename: file.name,
          audioFilesize: file.size,
          audioGeneratedAt: new Date().toISOString(),
        })

        setAudioUrl(data.url)
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
  }
}
