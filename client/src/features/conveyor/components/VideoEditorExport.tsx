/**
 * Страница экспорта (Этап 5)
 * ≤200 строк
 */

import { useParams } from 'wouter'
import { Loader2 } from 'lucide-react'
import { ExportPageHeader } from './video-editor/export/ExportPageHeader'
import { ExportAudioSection } from './video-editor/export/ExportAudioSection'
import { ExportVideoSection } from './video-editor/export/ExportVideoSection'
import { ExportMediaSection } from './video-editor/export/ExportMediaSection'
import { ExportArchiveSection } from './video-editor/export/ExportArchiveSection'
import { ExportPageFooter } from './video-editor/export/ExportPageFooter'
import { useVideoEditorData } from '@/features/conveyor/hooks/use-video-editor-data'
import { useMediaExport } from '@/features/conveyor/hooks/use-media-export'
import { useMediaDownload } from '@/features/conveyor/hooks/use-media-download'
import { getProxiedVideoUrl } from '@/features/conveyor/utils/media-proxy'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { AlertCircle } from 'lucide-react'

export function VideoEditorExport() {
  const params = useParams<{ id: string }>()
  const scriptId = params.id!

  const { script, isLoading: isScriptLoading } = useVideoEditorData(scriptId)
  const { media, isLoading: isMediaLoading, error, hasAudio, hasVideo } = useMediaExport(scriptId)
  const { isDownloading, downloadError, downloadFile } = useMediaDownload()

  // Обработчик скачивания аудио — через серверный прокси для обхода CORS
  const handleDownloadAudio = async () => {
    if (!media?.audioUrl) return
    const filename = media.audioFilename || `audio_${scriptId}.mp3`
    await downloadFile(`/api/scripts/${scriptId}/media/audio/download`, filename)
  }

  // Обработчик скачивания видео
  const handleDownloadVideo = async () => {
    if (!media?.videoUrl) return
    const filename = `video_${scriptId}.mp4`
    // Используем прокси с флагом download для корректного скачивания
    const downloadUrl = getProxiedVideoUrl(media.videoUrl, true)
    if (downloadUrl) {
      await downloadFile(downloadUrl, filename)
    }
  }

  // Состояние загрузки
  if (isScriptLoading || isMediaLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Загрузка данных...</span>
        </div>
      </div>
    )
  }

  // Ошибка загрузки
  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-6 space-y-6">
        <ExportPageHeader scriptId={scriptId} scriptTitle={script?.title} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка загрузки данных: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <ExportPageHeader scriptId={scriptId} scriptTitle={script?.title} />

      {/* Ошибка скачивания */}
      {downloadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ошибка скачивания: {downloadError}
          </AlertDescription>
        </Alert>
      )}

      {/* Секция аудио */}
      <ExportAudioSection
        media={media}
        isDownloading={isDownloading}
        onDownload={handleDownloadAudio}
      />

      {/* Секция видео */}
      <ExportVideoSection
        scriptId={scriptId}
        media={media}
        isDownloading={isDownloading}
        onDownload={handleDownloadVideo}
      />

      {/* Секция медиаконтента сцен */}
      <ExportMediaSection scriptId={scriptId} />

      {/* Секция архива */}
      <ExportArchiveSection
        scriptId={scriptId}
        media={media}
        scenesCount={Array.isArray((script as any)?.scenes) ? (script as any).scenes.length : 0}
      />

      {/* Футер */}
      <ExportPageFooter
        scriptId={scriptId}
        hasAudio={hasAudio}
        hasVideo={hasVideo}
      />
    </div>
  )
}
