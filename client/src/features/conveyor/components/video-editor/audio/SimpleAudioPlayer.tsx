/**
 * Упрощённый аудио плеер для conveyor
 * ≤100 строк
 */

import { useRef, useState } from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Play, Pause, Download } from 'lucide-react'

interface SimpleAudioPlayerProps {
  audioUrl: string
  filename?: string
  voiceName?: string
  uploadedFileName?: string
}

export function SimpleAudioPlayer({ 
  audioUrl, 
  filename = 'audio.mp3',
  voiceName,
  uploadedFileName,
}: SimpleAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleEnded = () => {
    setIsPlaying(false)
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true)

      // Загружаем файл через fetch
      const response = await fetch(audioUrl)
      
      if (!response.ok) {
        throw new Error('Failed to download audio')
      }

      // Получаем blob
      const blob = await response.blob()

      // Создаем URL для blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Создаем временную ссылку и кликаем по ней
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Очищаем
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Error downloading audio:', error)
      // Fallback: пробуем обычное скачивание
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = filename
      link.target = '_blank'
      link.click()
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleEnded}
            className="hidden"
            crossOrigin="anonymous"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <div className="flex-1">
              <div className="text-sm text-muted-foreground">
                {isPlaying ? 'Воспроизведение...' : 'Готово к воспроизведению'}
              </div>
              {(voiceName || uploadedFileName) && (
                <div className="text-xs text-muted-foreground/70 mt-1">
                  {voiceName ? `${voiceName}` : `${uploadedFileName}`}
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
