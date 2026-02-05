/**
 * Действия видео-редактора
 */

import { useLocation } from 'wouter'
import { Mic, User, Download } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import type { ScriptMediaStatus } from '../../services/scriptMediaService'

interface VideoEditorActionsProps {
  scriptId: string
  status: ScriptMediaStatus | undefined
}

export function VideoEditorActions({ scriptId, status }: VideoEditorActionsProps) {
  const [, navigate] = useLocation()

  const hasAudio = status?.hasAudio
  const hasVideo = status?.hasVideo

  return (
    <Card>
      <CardHeader>
        <CardTitle>Действия</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full"
          variant={hasAudio ? "outline" : "default"}
          onClick={() => navigate(`/conveyor/video-editor/${scriptId}/audio`)}
        >
          <Mic className="h-4 w-4 mr-2" />
          {hasAudio ? 'Изменить аудио' : 'Сгенерировать аудио'}
        </Button>

        <Button
          className="w-full"
          variant={hasVideo ? "outline" : "default"}
          onClick={() => navigate(`/conveyor/video-editor/${scriptId}/avatar`)}
          disabled={!hasAudio}
        >
          <User className="h-4 w-4 mr-2" />
          {hasVideo ? 'Изменить аватар' : 'Выбрать аватар'}
        </Button>

        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate(`/conveyor/video-editor/${scriptId}/export`)}
          disabled={!hasAudio && !hasVideo}
        >
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </CardContent>
    </Card>
  )
}
