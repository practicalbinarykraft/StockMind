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

export function VideoEditorHeader({ 
  script, 
  status,
}: VideoEditorHeaderProps) {
  const [, navigate] = useLocation()

  const hasAudio = status?.hasAudio
  const hasVideo = status?.hasVideo

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/conveyor/scripts')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Видео-редактор</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {script.title || 'Новый прорыв в области искусственного интеллекта'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/conveyor/editor/${script.id}`)}
          className="text-xs sm:text-sm"
        >
          <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Редактировать</span>
          <span className="sm:hidden">Редакт</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/conveyor/video-editor/${script.id}/audio`)}
          className="text-xs sm:text-sm"
        >
          <Mic className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Сгенерировать аудио</span>
          <span className="sm:hidden">Аудио</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/conveyor/video-editor/${script.id}/avatar`)}
          disabled={!hasAudio}
          className="text-xs sm:text-sm"
        >
          <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Сгенерировать аватар</span>
          <span className="sm:hidden">Аватар</span>
        </Button>

        <Button
          size="sm"
          onClick={() => navigate(`/conveyor/video-editor/${script.id}/export`)}
          disabled={!hasAudio && !hasVideo}
          className="text-xs sm:text-sm"
        >
          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Экспорт видео</span>
          <span className="sm:hidden">Экспорт</span>
        </Button>
      </div>
    </div>
  )
}
