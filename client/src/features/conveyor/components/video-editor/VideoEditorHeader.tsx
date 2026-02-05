/**
 * Заголовок видео-редактора
 */

import { useLocation } from 'wouter'
import { ArrowLeft, Edit } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { Script } from '../../types'

interface VideoEditorHeaderProps {
  script: Script
}

export function VideoEditorHeader({ script }: VideoEditorHeaderProps) {
  const [, navigate] = useLocation()

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
          <h1 className="text-2xl font-bold">{script.title}</h1>
          <p className="text-sm text-muted-foreground">
            Видео-редактор
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => navigate(`/conveyor/editor/${script.id}`)}
      >
        <Edit className="h-4 w-4 mr-2" />
        Редактировать текст
      </Button>
    </div>
  )
}
