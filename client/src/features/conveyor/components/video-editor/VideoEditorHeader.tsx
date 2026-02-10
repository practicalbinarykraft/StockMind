/**
 * Заголовок видео-редактора
 */

import { useLocation } from 'wouter'
import { ArrowLeft, Edit, Mic, User, Download, Monitor, Smartphone, Square } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils'
import type { Script } from '../../types'
import type { ScriptMediaStatus } from '../../services/scriptMediaService'

interface VideoEditorHeaderProps {
  script: Script
  status?: ScriptMediaStatus
  selectedFormat?: '16:9' | '9:16' | '1:1'
  onFormatChange?: (format: '16:9' | '9:16' | '1:1') => void
  userPlan?: 'free' | 'paid'
}

export function VideoEditorHeader({ 
  script, 
  status,
  selectedFormat,
  onFormatChange,
  userPlan = 'free'
}: VideoEditorHeaderProps) {
  const [, navigate] = useLocation()

  const hasAudio = status?.hasAudio
  const hasVideo = status?.hasVideo

  const formats: Array<{
    id: '16:9' | '9:16' | '1:1'
    icon: typeof Monitor
    label: string
  }> = [
    { id: '16:9', icon: Monitor, label: '16:9' },
    { id: '9:16', icon: Smartphone, label: '9:16' },
    { id: '1:1', icon: Square, label: '1:1' },
  ]

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
            {script.title || 'Новый прорыв в области искусственного интеллекта'}
          </p>
        </div>

        {/* Компактный селектор формата */}
        {selectedFormat && onFormatChange && (
          <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-secondary/30 rounded-lg border">
            <span className="text-xs font-medium text-muted-foreground">Формат:</span>
            <div className="flex gap-1">
              {formats.map((format) => {
                const Icon = format.icon
                const isSelected = selectedFormat === format.id
                return (
                  <button
                    key={format.id}
                    onClick={() => onFormatChange(format.id)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                    title={format.label}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{format.label}</span>
                  </button>
                )
              })}
            </div>
            {userPlan === 'free' ? (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                720p
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                1080p
              </span>
            )}
          </div>
        )}
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
