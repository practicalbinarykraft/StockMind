/**
 * Страница генерации аудио
 * ≤250 строк
 */

import { useParams } from 'wouter'
import { useState, useEffect, useCallback } from 'react'
import { AudioPageHeader } from './video-editor/audio/AudioPageHeader'
import { AudioTabs } from './video-editor/audio/AudioTabs'
import { AudioPageFooter } from './video-editor/audio/AudioPageFooter'
import { useVideoEditorData } from '@/features/conveyor/hooks/use-video-editor-data'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'

export function VideoEditorAudio() {
  const params = useParams<{ id: string }>()
  const scriptId = params.id!

  const { script, isLoading } = useVideoEditorData(scriptId)
  const [currentMode, setCurrentMode] = useState<'generate' | 'upload' | 'record'>('generate')
  const [hasAudio, setHasAudio] = useState(false)

  // Получаем текст сценария (из всех сцен)
  const scriptText = script?.fullText || script?.scenes?.map(s => s.text).join('\n\n') || ''

  // Функция для обновления статуса аудио
  const refreshAudioStatus = useCallback(async () => {
    try {
      const media = await scriptMediaService.getMedia(scriptId)
      setHasAudio(!!media?.audioUrl)
      if (media?.audioMode) {
        setCurrentMode(media.audioMode as any)
      }
    } catch (err) {
      console.error('Failed to refresh audio status:', err)
    }
  }, [scriptId])

  // Проверяем наличие аудио только при монтировании
  useEffect(() => {
    refreshAudioStatus()
  }, [refreshAudioStatus])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <AudioPageHeader scriptId={scriptId} scriptTitle={script?.title} />

      <AudioTabs
        scriptId={scriptId}
        scriptText={scriptText}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        onAudioGenerated={refreshAudioStatus}
      />

      <AudioPageFooter scriptId={scriptId} hasAudio={hasAudio} />
    </div>
  )
}
