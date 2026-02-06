/**
 * Прогресс-бар генерации видео
 * ≤80 строк
 */

import { Progress } from '@/shared/ui/progress'
import { Loader2 } from 'lucide-react'

interface VideoProgressBarProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  message?: string
}

export function VideoProgressBar({
  status,
  progress = 0,
  message,
}: VideoProgressBarProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'text-muted-foreground'
      case 'processing':
        return 'text-blue-600'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusText = () => {
    if (message) return message

    switch (status) {
      case 'pending':
        return 'Ожидание начала генерации...'
      case 'processing':
        return 'Генерация видео...'
      case 'completed':
        return 'Видео готово!'
      case 'failed':
        return 'Ошибка генерации'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {status === 'processing' && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        )}
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
      </div>

      {(status === 'processing' || status === 'pending') && (
        <Progress value={progress} className="h-2" />
      )}

      {status === 'processing' && progress > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  )
}
