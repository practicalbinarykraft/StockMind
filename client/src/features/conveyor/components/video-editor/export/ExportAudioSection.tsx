/**
 * Секция экспорта аудио
 * ≤120 строк
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { AlertCircle, Volume2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { MediaInfoCard } from './MediaInfoCard'
import { DownloadButton } from './DownloadButton'
import type { ScriptMedia } from '@/features/conveyor/services/scriptMediaService'

interface ExportAudioSectionProps {
  media: ScriptMedia | null
  isDownloading: boolean
  onDownload: () => void
}

export function ExportAudioSection({
  media,
  isDownloading,
  onDownload,
}: ExportAudioSectionProps) {
  const hasAudio = !!media?.audioUrl

  if (!hasAudio) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Аудио
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Аудио не сгенерировано. Перейдите на страницу генерации аудио.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Аудио
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MediaInfoCard
          type="audio"
          filename={media.audioFilename || 'audio.mp3'}
          filesize={media.audioFilesize}
          generatedAt={media.audioGeneratedAt}
        />

        {/* Аудио плеер */}
        {media.audioUrl && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Прослушать:</label>
            <audio
              controls
              src={media.audioUrl}
              className="w-full"
            />
          </div>
        )}

        {/* Кнопка скачивания */}
        <DownloadButton
          onDownload={onDownload}
          isDownloading={isDownloading}
          label="Скачать аудио"
        />
      </CardContent>
    </Card>
  )
}
