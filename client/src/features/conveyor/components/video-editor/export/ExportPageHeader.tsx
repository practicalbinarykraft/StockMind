/**
 * Заголовок страницы экспорта
 * ≤80 строк
 */

import { useLocation } from 'wouter'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface ExportPageHeaderProps {
  scriptId: string
  scriptTitle?: string
}

export function ExportPageHeader({ scriptId, scriptTitle }: ExportPageHeaderProps) {
  const [, navigate] = useLocation()

  const handleBack = () => {
    navigate(`/conveyor/video-editor/${scriptId}`)
  }

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="h-10 w-10"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="flex-1">
        <h1 className="text-2xl font-bold">Экспорт</h1>
        {scriptTitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {scriptTitle}
          </p>
        )}
      </div>
    </div>
  )
}
