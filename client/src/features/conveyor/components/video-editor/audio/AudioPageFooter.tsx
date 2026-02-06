/**
 * Футер страницы генерации аудио
 * ≤70 строк
 */

import { Button } from '@/shared/ui/button'
import { Check } from 'lucide-react'
import { useLocation } from 'wouter'

interface AudioPageFooterProps {
  scriptId: string
  hasAudio: boolean
}

export function AudioPageFooter({ scriptId, hasAudio }: AudioPageFooterProps) {
  const [, navigate] = useLocation()

  const handleDone = () => {
    navigate(`/conveyor/video-editor/${scriptId}`)
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <div className="flex items-center gap-2">
        {hasAudio && (
          <>
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              Аудио сохранено
            </span>
          </>
        )}
      </div>

      <Button onClick={handleDone} variant={hasAudio ? 'default' : 'outline'}>
        {hasAudio ? 'Готово' : 'Вернуться'}
      </Button>
    </div>
  )
}
