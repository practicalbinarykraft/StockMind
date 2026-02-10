/**
 * Компонент выбора формата видео (горизонтальный/вертикальный/квадратный)
 * ≤150 строк
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Monitor, Smartphone, Square } from 'lucide-react'
import { cn } from '@/shared/utils'

interface VideoFormat {
  id: '16:9' | '9:16' | '1:1'
  label: string
  description: string
  dimension: { width: number; height: number }
  icon: React.ReactNode
}

const VIDEO_FORMATS_720P: VideoFormat[] = [
  {
    id: '16:9',
    label: 'Горизонтальное',
    description: 'YouTube, Desktop (1280×720)',
    dimension: { width: 1280, height: 720 },
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    id: '9:16',
    label: 'Вертикальное',
    description: 'TikTok, Reels, Shorts (720×1280)',
    dimension: { width: 720, height: 1280 },
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    id: '1:1',
    label: 'Квадратное',
    description: 'Instagram Feed (720×720)',
    dimension: { width: 720, height: 720 },
    icon: <Square className="h-5 w-5" />,
  },
]

const VIDEO_FORMATS_1080P: VideoFormat[] = [
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
  userPlan?: 'free' | 'paid'
}

export function VideoFormatSelector({
  selectedFormat,
  onFormatChange,
  disabled = false,
  userPlan = 'free',
}: VideoFormatSelectorProps) {
  // Выбираем массив форматов в зависимости от плана
  const formats = userPlan === 'paid' ? VIDEO_FORMATS_1080P : VIDEO_FORMATS_720P

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Формат видео</CardTitle>
          {userPlan === 'free' ? (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              Макс. 720p
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              HD 1080p
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {formats.map((format) => (
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

        {userPlan === 'free' && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            💡 Бесплатный план HeyGen ограничен разрешением 720p
          </p>
        )}
      </CardContent>
    </Card>
  )
}
