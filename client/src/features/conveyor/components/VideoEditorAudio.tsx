/**
 * Страница генерации аудио
 * ≤250 строк
 */

import { useParams } from 'wouter'
import { useState, useEffect } from 'react'
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

  // Проверяем наличие аудио
  useEffect(() => {
    const checkAudio = async () => {
      try {
        const media = await scriptMediaService.getMedia(scriptId)
        setHasAudio(!!media?.audioUrl)
        if (media?.audioMode) {
          setCurrentMode(media.audioMode as any)
        }
      } catch (err) {
        console.error('Failed to check audio status:', err)
      }
    }

    checkAudio()

    // Проверяем каждые 3 секунды (на случай изменений)
    const interval = setInterval(checkAudio, 3000)
    return () => clearInterval(interval)
  }, [scriptId])

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
      />

      <AudioPageFooter scriptId={scriptId} hasAudio={hasAudio} />
    </div>
  )
}
