/**
 * Превью видео
 */

import { Card, CardContent } from '@/shared/ui/card'
import { Video, Monitor, Smartphone, Square, AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/utils'
import type { ScriptMedia, ScriptMediaStatus } from '../../services/scriptMediaService'
import { getProxiedImageUrl, getProxiedVideoUrl } from '@/features/conveyor/utils/media-proxy'
import { useVideoFormatStore } from '../../stores/useVideoFormatStore'

interface VideoEditorPreviewProps {
  media: ScriptMedia | null | undefined
  status: ScriptMediaStatus | undefined
  selectedFormat?: '16:9' | '9:16' | '1:1'
  onFormatChange?: (format: '16:9' | '9:16' | '1:1') => void
}

export function VideoEditorPreview({ 
  media, 
  status,
  selectedFormat,
  onFormatChange,
}: VideoEditorPreviewProps) {
  const { selectedQuality, setQuality } = useVideoFormatStore()
  
  // Проверяем videoUrl напрямую из media, так как status может быть не синхронизирован
  const hasVideo = media?.videoUrl && media?.videoStatus === 'completed'
  const isGenerating = media?.videoStatus === 'generating'
  
  // Проксируем URL медиа для обхода CORS
  const proxiedVideoUrl = getProxiedVideoUrl(media?.videoUrl)
  const proxiedThumbnailUrl = getProxiedImageUrl(media?.videoThumbnailUrl)

  const formats: Array<{
    id: '16:9' | '9:16' | '1:1'
    icon: typeof Monitor
    label: string
  }> = [
    { id: '16:9', icon: Monitor, label: '16:9' },
    { id: '9:16', icon: Smartphone, label: '9:16' },
    { id: '1:1', icon: Square, label: '1:1' },
  ]

  return (
    <Card className="h-full flex flex-col">
      {/* Селектор формата и качества */}
      {selectedFormat && onFormatChange && (
        <div className="px-6 pt-4 pb-2 space-y-3">
          {/* Формат */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Формат:</span>
              <div className="flex gap-1">
                {formats.map((format) => {
                  const Icon = format.icon
                  const isSelected = selectedFormat === format.id
                  return (
                    <button
                      key={format.id}
                      onClick={() => onFormatChange(format.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                      title={format.label}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{format.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Качество */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Качество:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setQuality('720p')}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm font-medium transition-all',
                    selectedQuality === '720p'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  720p
                </button>
                <button
                  onClick={() => setQuality('1080p')}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm font-medium transition-all',
                    selectedQuality === '1080p'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  1080p
                </button>
              </div>
            </div>
          </div>

          {/* Предупреждение о 1080p */}
          {selectedQuality === '1080p' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">Требуется платная подписка HeyGen</p>
                <p className="mt-0.5 text-amber-700">
                  Для генерации видео в качестве 1080p необходима активная платная подписка HeyGen
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <CardContent className="p-6 flex-1 min-h-0">
        <div className="h-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
          {hasVideo ? (
            <video
              src={proxiedVideoUrl}
              controls
              className="w-full h-full object-cover"
              poster={proxiedThumbnailUrl}
            />
          ) : isGenerating ? (
            <div className="text-center">
              <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-sm text-muted-foreground">
                Генерация видео...
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Превью видео
              </p>
              <p className="text-sm text-blue-400">
                Будет реализовано позже
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
