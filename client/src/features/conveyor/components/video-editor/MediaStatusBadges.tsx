/**
 * Бейджи статуса медиа
 */

import { Badge } from '@/shared/ui/badge'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { ScriptMediaStatus } from '../../services/scriptMediaService'

interface MediaStatusBadgesProps {
  status: ScriptMediaStatus | undefined
}

export function MediaStatusBadges({ status }: MediaStatusBadgesProps) {
  const hasAudio = status?.hasAudio
  const hasVideo = status?.hasVideo
  const videoStatus = status?.videoStatus

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Аудио:</span>
        {hasAudio ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Готово
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Нет
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Видео:</span>
        {videoStatus === 'generating' ? (
          <Badge variant="default" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Генерация
          </Badge>
        ) : hasVideo ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Готово
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Нет
          </Badge>
        )}
      </div>
    </div>
  )
}
