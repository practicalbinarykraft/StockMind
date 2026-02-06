/**
 * Хук для генерации аудио через ElevenLabs
 * ≤200 строк
 */

import { useState, useCallback } from 'react'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'
import { apiRequest } from '@/shared/api/http'

interface UseAudioGenerationReturn {
  selectedVoice: string | null
  setSelectedVoice: (voice: string) => void
  isGenerating: boolean
  audioUrl: string | null
  generate: (text: string, voiceId: string) => Promise<void>
  error: string | null
}

/**
 * Конвертирует base64 в Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteArrays: Uint8Array[] = []

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    
    byteArrays.push(new Uint8Array(byteNumbers))
  }

  return new Blob(byteArrays as BlobPart[], { type: mimeType })
}

export function useAudioGeneration(scriptId: string): UseAudioGenerationReturn {
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Загрузка существующего аудио при монтировании
  const loadExistingAudio = useCallback(async () => {
    try {
      const media = await scriptMediaService.getMedia(scriptId)
      if (media?.audioUrl) {
        setAudioUrl(media.audioUrl)
        if (media.selectedVoice) {
          setSelectedVoice(media.selectedVoice)
        }
      }
    } catch (err) {
      console.error('Failed to load existing audio:', err)
    }
  }, [scriptId])

  // Вызываем при монтировании
  useState(() => {
    loadExistingAudio()
  })

  const generate = useCallback(
    async (text: string, voiceId: string) => {
      setIsGenerating(true)
      setError(null)

      try {
        // Генерация через ElevenLabs API
        const response = await apiRequest('POST', '/api/elevenlabs/generate', {
          text,
          voiceId,
        })

        const data = await response.json()

        if (!data.audio) {
          throw new Error('Не удалось получить аудио данные')
        }

        // Конвертируем base64 в blob URL
        const audioBlob = base64ToBlob(data.audio, 'audio/mpeg')
        const audioUrl = URL.createObjectURL(audioBlob)

        // Сохранение в scripts_media
        await scriptMediaService.updateAudio(scriptId, {
          audioUrl: audioUrl,
          audioMode: 'generate',
          selectedVoice: voiceId,
          audioFilename: `audio-${Date.now()}.mp3`,
          audioFilesize: data.size,
          audioGeneratedAt: new Date().toISOString(),
        })

        setAudioUrl(audioUrl)
        setSelectedVoice(voiceId)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Ошибка генерации аудио'
        setError(message)
        console.error('Audio generation error:', err)
      } finally {
        setIsGenerating(false)
      }
    },
    [scriptId]
  )

  return {
    selectedVoice,
    setSelectedVoice,
    isGenerating,
    audioUrl,
    generate,
    error,
  }
}
