/**
 * Компонент записи голоса с визуализацией
 * ≤150 строк
 */

import { Button } from '@/shared/ui/button'
import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react'
import { cn } from '@/shared/utils'

interface VoiceRecorderProps {
  isRecording: boolean
  isPaused: boolean
  duration: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onDiscard: () => void
}

export function VoiceRecorder({
  isRecording,
  isPaused,
  duration,
  onStart,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: VoiceRecorderProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        {/* Визуализация записи */}
        <div
          className={cn(
            'w-32 h-32 rounded-full flex items-center justify-center transition-all',
            isRecording && !isPaused
              ? 'bg-destructive/20 animate-pulse'
              : 'bg-muted'
          )}
        >
          <Mic
            className={cn(
              'h-16 w-16',
              isRecording && !isPaused ? 'text-destructive' : 'text-muted-foreground'
            )}
          />
        </div>

        {/* Таймер */}
        <div className="text-3xl font-mono font-bold">
          {formatDuration(duration)}
        </div>

        {/* Статус */}
        <div className="text-sm text-muted-foreground">
          {isRecording && !isPaused && 'Идёт запись...'}
          {isRecording && isPaused && 'Пауза'}
          {!isRecording && duration === 0 && 'Нажмите кнопку для начала записи'}
          {!isRecording && duration > 0 && 'Запись завершена'}
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="flex items-center justify-center gap-2">
        {!isRecording ? (
          <Button onClick={onStart} size="lg">
            <Mic className="mr-2 h-4 w-4" />
            Начать запись
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button onClick={onResume} size="lg" variant="default">
                <Play className="mr-2 h-4 w-4" />
                Продолжить
              </Button>
            ) : (
              <Button onClick={onPause} size="lg" variant="secondary">
                <Pause className="mr-2 h-4 w-4" />
                Пауза
              </Button>
            )}
            <Button onClick={onStop} size="lg" variant="default">
              <Square className="mr-2 h-4 w-4" />
              Остановить
            </Button>
          </>
        )}

        {duration > 0 && !isRecording && (
          <Button onClick={onDiscard} size="lg" variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
          </Button>
        )}
      </div>
    </div>
  )
}
