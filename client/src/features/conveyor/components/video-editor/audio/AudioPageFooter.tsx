/**
 * Футер страницы генерации аудио
 * ≤70 строк
 */

import { Button } from '@/shared/ui/button'
import { Check } from 'lucide-react'
import { useLocation } from 'wouter'
import { useQueryClient } from '@tanstack/react-query'

interface AudioPageFooterProps {
  scriptId: string
  hasAudio: boolean
}

export function AudioPageFooter({ scriptId, hasAudio }: AudioPageFooterProps) {
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ['script-media-status', scriptId] })
    queryClient.invalidateQueries({ queryKey: ['script-media', scriptId] })
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
