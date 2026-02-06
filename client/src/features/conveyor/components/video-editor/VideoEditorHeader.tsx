/**
 * Заголовок видео-редактора
 */

import { useLocation } from 'wouter'
import { ArrowLeft, Edit, Mic, User, Download } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { Script } from '../../types'
import type { ScriptMediaStatus } from '../../services/scriptMediaService'

interface VideoEditorHeaderProps {
  script: Script
  status?: ScriptMediaStatus
}

export function VideoEditorHeader({ script, status }: VideoEditorHeaderProps) {
  const [, navigate] = useLocation()

  const hasAudio = status?.hasAudio
  const hasVideo = status?.hasVideo

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/conveyor/scripts')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">Видео-редактор</h1>
          <p className="text-sm text-muted-foreground">
            Новый прорыв в области искусственного интеллекта
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => navigate(`/conveyor/editor/${script.id}`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Редактировать
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(`/conveyor/video-editor/${script.id}/audio`)}
        >
          <Mic className="h-4 w-4 mr-2" />
          Сгенерировать аудио
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate(`/conveyor/video-editor/${script.id}/avatar`)}
          disabled={!hasAudio}
        >
          <User className="h-4 w-4 mr-2" />
          Сгенерировать аватар
        </Button>

        <Button
          onClick={() => navigate(`/conveyor/video-editor/${script.id}/export`)}
          disabled={!hasAudio && !hasVideo}
        >
          <Download className="h-4 w-4 mr-2" />
          Экспорт видео
        </Button>
      </div>
    </div>
  )
}
