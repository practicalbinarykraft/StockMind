/**
 * Секция генерации видео с кнопкой и прогрессом
 * ≤150 строк
 */

import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { VideoProgressBar } from './VideoProgressBar'
import { Loader2, Video } from 'lucide-react'
import { getProxiedVideoUrl } from '../../../utils/media-proxy'

interface VideoGenerationSectionProps {
  selectedAvatarId: string | null
  hasAudio: boolean
  isGenerating: boolean
  videoStatus: 'pending' | 'processing' | 'completed' | 'failed' | null
  videoProgress?: number
  videoUrl: string | null
  errorMessage?: string
  onGenerate: () => void
}

export function VideoGenerationSection({
  selectedAvatarId,
  hasAudio,
  isGenerating,
  videoStatus,
  videoProgress,
  videoUrl,
  errorMessage,
  onGenerate,
}: VideoGenerationSectionProps) {
  const canGenerate = selectedAvatarId && hasAudio && !isGenerating
  
  // Проксируем URL видео для обхода CORS и CSP
  const proxiedVideoUrl = getProxiedVideoUrl(videoUrl)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Генерация видео
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Требования */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                selectedAvatarId ? 'bg-green-600' : 'bg-muted'
              }`}
            />
            <span className={selectedAvatarId ? 'text-foreground' : 'text-muted-foreground'}>
              Аватар выбран
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                hasAudio ? 'bg-green-600' : 'bg-muted'
              }`}
            />
            <span className={hasAudio ? 'text-foreground' : 'text-muted-foreground'}>
              Аудио загружено
            </span>
          </div>
        </div>

        {/* Кнопка генерации */}
        <Button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Генерация...
            </>
          ) : (
            'Сгенерировать видео'
          )}
        </Button>

        {/* Прогресс */}
        {videoStatus && videoStatus !== 'completed' && (
          <VideoProgressBar
            status={videoStatus}
            progress={videoProgress}
            message={errorMessage}
          />
        )}

        {/* Ошибка */}
        {errorMessage && videoStatus === 'failed' && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {errorMessage}
          </div>
        )}

        {/* Превью видео */}
        {proxiedVideoUrl && videoStatus === 'completed' && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-green-600">
              Видео готово!
            </p>
            <div className="w-full bg-muted rounded-md flex items-center justify-center overflow-hidden">
              <video
                src={proxiedVideoUrl}
                controls
                className="max-w-full max-h-full object-contain rounded-md"
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxHeight: '500px',
                }}
              >
                Ваш браузер не поддерживает видео
              </video>
            </div>
          </div>
        )}

        {/* Подсказка */}
        {!hasAudio && (
          <p className="text-xs text-muted-foreground">
            Сначала создайте аудио на странице генерации аудио
          </p>
        )}
        {hasAudio && !selectedAvatarId && (
          <p className="text-xs text-muted-foreground">
            Выберите аватар из списка выше
          </p>
        )}
      </CardContent>
    </Card>
  )
}
