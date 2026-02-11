/**
 * Секция экспорта видео
 * ≤150 строк
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { AlertCircle, Video, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { MediaInfoCard } from './MediaInfoCard'
import { DownloadButton } from './DownloadButton'
import type { ScriptMedia } from '@/features/conveyor/services/scriptMediaService'
import { getProxiedImageUrl, getProxiedVideoUrl } from '@/features/conveyor/utils/media-proxy'

interface ExportVideoSectionProps {
  media: ScriptMedia | null
  isDownloading: boolean
  onDownload: () => void
}

export function ExportVideoSection({
  media,
  isDownloading,
  onDownload,
}: ExportVideoSectionProps) {
  const hasVideo = !!media?.videoUrl && media.videoStatus === 'completed'
  const isGenerating = media?.videoStatus === 'generating'
  const hasFailed = media?.videoStatus === 'failed'
  
  // Проксируем URL медиа для обхода CORS
  const proxiedVideoUrl = getProxiedVideoUrl(media?.videoUrl)
  const proxiedThumbnailUrl = getProxiedImageUrl(media?.videoThumbnailUrl)

  // Видео генерируется
  if (isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Видео
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Видео генерируется... Это может занять несколько минут.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Ошибка генерации
  if (hasFailed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Видео
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {media.videoErrorMessage || 'Ошибка генерации видео. Попробуйте снова.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Видео не сгенерировано
  if (!hasVideo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Видео
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Видео не сгенерировано. Перейдите на страницу выбора аватара.
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
          <Video className="h-5 w-5" />
          Видео
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MediaInfoCard
          type="video"
          duration={media.videoDuration}
          generatedAt={media.videoGeneratedAt}
        />

        {/* Видео плеер */}
        {proxiedVideoUrl && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Просмотр:</label>
            <div className="bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              <video
                controls
                src={proxiedVideoUrl}
                poster={proxiedThumbnailUrl}
                className="max-w-full max-h-[500px] object-contain rounded-lg"
                style={{
                  width: 'auto',
                  height: 'auto',
                }}
              />
            </div>
          </div>
        )}

        {/* Кнопка скачивания */}
        <DownloadButton
          onDownload={onDownload}
          isDownloading={isDownloading}
          label="Скачать видео"
        />
      </CardContent>
    </Card>
  )
}
