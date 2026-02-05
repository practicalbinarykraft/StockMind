/**
 * Превью видео
 */

import { Card, CardContent } from '@/shared/ui/card'
import { Film, Video } from 'lucide-react'
import type { ScriptMedia, ScriptMediaStatus } from '../../services/scriptMediaService'

interface VideoEditorPreviewProps {
  media: ScriptMedia | null | undefined
  status: ScriptMediaStatus | undefined
}

export function VideoEditorPreview({ media, status }: VideoEditorPreviewProps) {
  const hasVideo = status?.hasVideo && media?.videoUrl
  const isGenerating = status?.videoStatus === 'generating'

  return (
    <Card>
      <CardContent className="p-6">
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
          {hasVideo ? (
            <video
              src={media.videoUrl}
              controls
              className="w-full h-full object-cover"
              poster={media.videoThumbnailUrl}
            />
          ) : isGenerating ? (
            <div className="text-center">
              <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Генерация видео...
              </p>
            </div>
          ) : (
            <div className="text-center">
              <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Видео ещё не создано
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Сначала создайте аудио, затем выберите аватар
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
