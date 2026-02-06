/**
 * Превью видео
 */

import { Card, CardContent } from '@/shared/ui/card'
import { Video } from 'lucide-react'
import type { ScriptMedia, ScriptMediaStatus } from '../../services/scriptMediaService'

interface VideoEditorPreviewProps {
  media: ScriptMedia | null | undefined
  status: ScriptMediaStatus | undefined
}

export function VideoEditorPreview({ media, status }: VideoEditorPreviewProps) {
  const hasVideo = status?.hasVideo && media?.videoUrl
  const isGenerating = status?.videoStatus === 'generating'

  return (
    <Card className="h-full">
      <CardContent className="p-6 h-full">
        <div className="h-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
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
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Превью видео
              </p>
              <p className="text-sm text-blue-400">
                Будет реализовано позже
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
