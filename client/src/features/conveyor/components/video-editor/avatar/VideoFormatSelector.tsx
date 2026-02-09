/**
 * Компонент выбора формата видео (горизонтальный/вертикальный/квадратный)
 * ≤150 строк
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Monitor, Smartphone, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoFormat {
  id: '16:9' | '9:16' | '1:1'
  label: string
  description: string
  dimension: { width: number; height: number }
  icon: React.ReactNode
}

const VIDEO_FORMATS: VideoFormat[] = [
  {
    id: '16:9',
    label: 'Горизонтальное',
    description: 'YouTube, Desktop (1920×1080)',
    dimension: { width: 1920, height: 1080 },
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    id: '9:16',
    label: 'Вертикальное',
    description: 'TikTok, Reels, Shorts (1080×1920)',
    dimension: { width: 1080, height: 1920 },
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    id: '1:1',
    label: 'Квадратное',
    description: 'Instagram Feed (1080×1080)',
    dimension: { width: 1080, height: 1080 },
    icon: <Square className="h-5 w-5" />,
  },
]

interface VideoFormatSelectorProps {
  selectedFormat: '16:9' | '9:16' | '1:1'
  onFormatChange: (
    format: '16:9' | '9:16' | '1:1',
    dimension: { width: number; height: number }
  ) => void
  disabled?: boolean
}

export function VideoFormatSelector({
  selectedFormat,
  onFormatChange,
  disabled = false,
}: VideoFormatSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Формат видео</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VIDEO_FORMATS.map((format) => (
            <button
              key={format.id}
              onClick={() => onFormatChange(format.id, format.dimension)}
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
      </CardContent>
    </Card>
  )
}
