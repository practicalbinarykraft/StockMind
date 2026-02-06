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

export function useAudioGeneration(
  scriptId: string,
  onAudioGenerated?: () => void
): UseAudioGenerationReturn {
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

        if (!data.audioUrl) {
          throw new Error('Не удалось получить URL аудио')
        }

        // Сохранение в scripts_media (дата генерации устанавливается на сервере)
        await scriptMediaService.updateAudio(scriptId, {
          audioUrl: data.audioUrl,
          audioMode: 'generate',
          selectedVoice: voiceId,
          audioFilename: data.filename,
          audioFilesize: data.size,
        })

        setAudioUrl(data.audioUrl)
        setSelectedVoice(voiceId)
        
        // Вызываем callback после успешной генерации
        onAudioGenerated?.()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Ошибка генерации аудио'
        setError(message)
        console.error('Audio generation error:', err)
      } finally {
        setIsGenerating(false)
      }
    },
    [scriptId, onAudioGenerated]
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
