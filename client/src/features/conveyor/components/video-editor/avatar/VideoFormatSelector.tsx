/**
 * Компонент выбора формата и качества видео
 * ≤200 строк
 */

import { Card, CardContent } from '@/shared/ui/card'
import { Monitor, Smartphone, Square } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Switch } from '@/shared/ui/switch'
import { Label } from '@/shared/ui/label'

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
  greenScreen: boolean
  onFormatChange: (format: '16:9' | '9:16' | '1:1') => void
  onQualityChange: (quality: '720p' | '1080p') => void
  onGreenScreenChange: (enabled: boolean) => void
  disabled?: boolean
}

export function VideoFormatSelector({
  selectedFormat,
  selectedQuality,
  greenScreen,
  onFormatChange,
  onQualityChange,
  onGreenScreenChange,
  disabled = false,
}: VideoFormatSelectorProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
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
          <select
            value={selectedQuality}
            onChange={(e) => onQualityChange(e.target.value as '720p' | '1080p')}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-3 rounded-lg border-2 bg-background',
              'text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'cursor-pointer'
            )}
          >
            <option value="720p">720p - Стандартное качество</option>
            <option value="1080p">1080p - HD качество</option>
          </select>
        </div>

        {/* Зелёный экран */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Удаление фона</h3>
          <div
            className={cn(
              'flex items-center justify-between p-4 rounded-lg border-2 transition-all',
              greenScreen
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-border bg-background'
            )}
          >
            <div className="space-y-1">
              <Label htmlFor="green-screen" className="text-sm font-medium cursor-pointer">
                Зелёный экран
              </Label>
              <p className="text-xs text-muted-foreground">
                Генерация с зелёным фоном для последующей замены на своё видео/фото в редакторе
              </p>
            </div>
            <Switch
              id="green-screen"
              checked={greenScreen}
              onCheckedChange={onGreenScreenChange}
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
