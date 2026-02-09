/**
 * Хук для генерации аудио через ElevenLabs
 * ≤200 строк
 */

import { useState, useCallback } from 'react'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'
import { apiRequest } from '@/shared/api/http'

interface Voice {
  voice_id: string
  name: string
}

interface UseAudioGenerationReturn {
  selectedVoice: string | null
  setSelectedVoice: (voice: string) => void
  isGenerating: boolean
  audioUrl: string | null
  generate: (text: string, voiceId: string) => Promise<void>
  error: string | null
  voiceName: string | null
}

export function useAudioGeneration(
  scriptId: string,
  onAudioGenerated?: () => void
): UseAudioGenerationReturn {
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [voiceName, setVoiceName] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])

  // Загрузка списка голосов
  const loadVoices = useCallback(async () => {
    try {
      const response = await apiRequest('GET', '/api/elevenlabs/voices')
      const data = await response.json()
      const voicesArray = Array.isArray(data) ? data : (data.voices || [])
      setVoices(voicesArray)
      return voicesArray
    } catch (err) {
      console.error('Failed to load voices:', err)
      return []
    }
  }, [])

  // Получить имя голоса по ID
  const getVoiceName = useCallback((voiceId: string, voicesList?: Voice[]) => {
    const voicesToSearch = voicesList || voices
    const voice = voicesToSearch.find((v) => v.voice_id === voiceId)
    return voice?.name || null
  }, [voices])

  // Загрузка существующего аудио при монтировании
  const loadExistingAudio = useCallback(async () => {
    try {
      const media = await scriptMediaService.getMedia(scriptId)
      const voicesList = await loadVoices()
      
      if (media?.audioUrl) {
        // Проверяем что URL не blob (старые данные)
        if (media.audioUrl.startsWith('blob:')) {
          console.warn('Found old blob URL in database, ignoring:', media.audioUrl)
          setAudioUrl(null)
          return
        }
        
        setAudioUrl(media.audioUrl)
        if (media.selectedVoice) {
          setSelectedVoice(media.selectedVoice)
          const name = getVoiceName(media.selectedVoice, voicesList)
          setVoiceName(name)
        }
      }
    } catch (err) {
      console.error('Failed to load existing audio:', err)
    }
  }, [scriptId, loadVoices, getVoiceName])

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

        console.log('Generation response:', data) // Логирование для отладки

        if (!data.audioUrl) {
          throw new Error('Не удалось получить URL аудио')
        }

        // Проверяем что URL корректный (не blob)
        if (data.audioUrl.startsWith('blob:')) {
          throw new Error('Получен некорректный blob URL вместо серверного пути')
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
        const name = getVoiceName(voiceId)
        setVoiceName(name)
        
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
    voiceName,
  }
}
