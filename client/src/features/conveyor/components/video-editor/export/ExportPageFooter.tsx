/**
 * Футер страницы экспорта
 * ≤70 строк
 */

import { useLocation } from 'wouter'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface ExportPageFooterProps {
  scriptId: string
  hasAudio: boolean
  hasVideo: boolean
}

export function ExportPageFooter({
  scriptId,
  hasAudio,
  hasVideo,
}: ExportPageFooterProps) {
  const [, navigate] = useLocation()

  const handleBack = () => {
    navigate(`/conveyor/video-editor/${scriptId}`)
  }

  const allReady = hasAudio && hasVideo

  return (
    <div className="flex items-center justify-between pt-6 border-t">
      <div className="flex items-center gap-2 text-sm">
        {allReady ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-muted-foreground">
              Все файлы готовы к экспорту
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            {!hasAudio && 'Аудио не готово. '}
            {!hasVideo && 'Видео не готово.'}
          </span>
        )}
      </div>

      <Button
        variant="outline"
        onClick={handleBack}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Назад к редактору
      </Button>
    </div>
  )
}
