/**
 * Хук для получения данных медиа для экспорта
 * ≤150 строк
 */

import { useState, useEffect } from 'react'
import { scriptMediaService, type ScriptMedia } from '@/features/conveyor/services/scriptMediaService'

interface UseMediaExportReturn {
  media: ScriptMedia | null
  isLoading: boolean
  error: string | null
  hasAudio: boolean
  hasVideo: boolean
  refresh: () => Promise<void>
}

export function useMediaExport(scriptId: string): UseMediaExportReturn {
  const [media, setMedia] = useState<ScriptMedia | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMedia = async () => {
    if (!scriptId) {
      setError('Script ID is required')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await scriptMediaService.getMedia(scriptId)
      setMedia(data)
    } catch (err) {
      console.error('Failed to load media:', err)
      setError(err instanceof Error ? err.message : 'Failed to load media')
      setMedia(null)
    } finally {
      setIsLoading(false)
    }
  }

  const refresh = async () => {
    await loadMedia()
  }

  useEffect(() => {
    loadMedia()
  }, [scriptId])

  const hasAudio = !!media?.audioUrl
  const hasVideo = !!media?.videoUrl && media.videoStatus === 'completed'

  return {
    media,
    isLoading,
    error,
    hasAudio,
    hasVideo,
    refresh,
  }
}
