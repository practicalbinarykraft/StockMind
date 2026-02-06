/**
 * Хедер страницы генерации аудио
 * ≤80 строк
 */

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useLocation } from 'wouter'

interface AudioPageHeaderProps {
  scriptId: string
  scriptTitle?: string
}

export function AudioPageHeader({ scriptId, scriptTitle }: AudioPageHeaderProps) {
  const [, navigate] = useLocation()

  const handleBack = () => {
    navigate(`/conveyor/video-editor/${scriptId}`)
  }

  return (
    <div className="flex items-center gap-4 pb-4 border-b">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        aria-label="Назад к редактору"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1">
        <h1 className="text-2xl font-bold">Генерация аудио</h1>
        {scriptTitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {scriptTitle}
          </p>
        )}
      </div>
    </div>
  )
}
