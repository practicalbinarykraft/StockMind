/**
 * Компонент выбора формата и качества видео
 * ≤200 строк
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Monitor, Smartphone, Square, AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/utils'

interface VideoFormat {
  id: '16:9' | '9:16' | '1:1'
  label: string
  description: string
  icon: React.ReactNode
}

const VIDEO_FORMATS: VideoFormat[] = [
  {
    id: '16:9',
    label: 'Горизонтальное',
    description: 'YouTube, Desktop',
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    id: '9:16',
    label: 'Вертикальное',
    description: 'TikTok, Reels, Shorts',
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    id: '1:1',
    label: 'Квадратное',
    description: 'Instagram Feed',
    icon: <Square className="h-5 w-5" />,
  },
]

interface VideoFormatSelectorProps {
  selectedFormat: '16:9' | '9:16' | '1:1'
  selectedQuality: '720p' | '1080p'
  onFormatChange: (format: '16:9' | '9:16' | '1:1') => void
  onQualityChange: (quality: '720p' | '1080p') => void
  disabled?: boolean
}

export function VideoFormatSelector({
  selectedFormat,
  selectedQuality,
  onFormatChange,
  onQualityChange,
  disabled = false,
}: VideoFormatSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Формат и качество видео</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Выбор формата */}
        <div>
          <h3 className="text-sm font-medium mb-3">Формат видео</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {VIDEO_FORMATS.map((format) => (
              <button
                key={format.id}
                onClick={() => onFormatChange(format.id)}
                disabled={disabled}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  'hover:border-primary/50 hover:bg-accent/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  selectedFormat === format.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background'
                )}
              >
                <div
                  className={cn(
                    'transition-colors',
                    selectedFormat === format.id
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {format.icon}
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{format.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Выбор качества */}
        <div>
          <h3 className="text-sm font-medium mb-3">Качество видео</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onQualityChange('720p')}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                'hover:border-primary/50 hover:bg-accent/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selectedQuality === '720p'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background'
              )}
            >
              <div className="text-center w-full">
                <div className="text-lg font-bold">720p</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Стандартное качество
                </div>
              </div>
            </button>

            <button
              onClick={() => onQualityChange('1080p')}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                'hover:border-primary/50 hover:bg-accent/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selectedQuality === '1080p'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background'
              )}
            >
              <div className="text-center w-full">
                <div className="text-lg font-bold">1080p</div>
                <div className="text-xs text-muted-foreground mt-1">
                  HD качество
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Предупреждение о 1080p */}
        {selectedQuality === '1080p' && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">Требуется платная подписка HeyGen</p>
              <p className="mt-1 text-amber-800">
                Для генерации видео в качестве 1080p необходима активная платная подписка HeyGen. 
                При использовании бесплатного плана генерация может завершиться ошибкой.
              </p>
            </div>
          </div>
        )}

        {/* Информация о разрешении */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
          <p className="font-medium mb-1">Текущее разрешение:</p>
          <p>
            {selectedQuality === '720p' && selectedFormat === '16:9' && '1280×720'}
            {selectedQuality === '720p' && selectedFormat === '9:16' && '720×1280'}
            {selectedQuality === '720p' && selectedFormat === '1:1' && '720×720'}
            {selectedQuality === '1080p' && selectedFormat === '16:9' && '1920×1080'}
            {selectedQuality === '1080p' && selectedFormat === '9:16' && '1080×1920'}
            {selectedQuality === '1080p' && selectedFormat === '1:1' && '1080×1080'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
