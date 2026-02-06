/**
 * Футер страницы выбора аватара
 * ≤70 строк
 */

import { Button } from '@/shared/ui/button'
import { Check } from 'lucide-react'
import { useLocation } from 'wouter'

interface AvatarPageFooterProps {
  scriptId: string
  hasVideo: boolean
}

export function AvatarPageFooter({ scriptId, hasVideo }: AvatarPageFooterProps) {
  const [, navigate] = useLocation()

  const handleDone = () => {
    navigate(`/conveyor/video-editor/${scriptId}`)
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <div className="flex items-center gap-2">
        {hasVideo && (
          <>
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              Видео сгенерировано
            </span>
          </>
        )}
      </div>

      <Button onClick={handleDone} variant={hasVideo ? 'default' : 'outline'}>
        {hasVideo ? 'Готово' : 'Вернуться'}
      </Button>
    </div>
  )
}
