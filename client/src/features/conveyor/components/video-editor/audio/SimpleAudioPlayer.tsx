/**
 * Упрощённый аудио плеер для conveyor
 * ≤130 строк
 */

import { useRef, useState, useEffect } from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Play, Pause, Download } from 'lucide-react'

interface SimpleAudioPlayerProps {
  audioUrl: string
  scriptId?: string // Опциональный scriptId для использования прокси
  filename?: string
  voiceName?: string
  uploadedFileName?: string
}

export function SimpleAudioPlayer({ 
  audioUrl, 
  scriptId,
  filename = 'audio.mp3',
  voiceName,
  uploadedFileName,
}: SimpleAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  // Определяем URL для воспроизведения и скачивания
  const streamUrl = scriptId 
    ? `/api/scripts/${scriptId}/media/audio/stream`
    : audioUrl
  
  const downloadUrl = scriptId
    ? `/api/scripts/${scriptId}/media/audio/download`
    : audioUrl

  // Логируем при монтировании и изменении
  useEffect(() => {
    console.log('SimpleAudioPlayer mounted', { 
      scriptId, 
      streamUrl,
      downloadUrl,
      originalAudioUrl: audioUrl 
    })
    setAudioError(null)
  }, [audioUrl, scriptId, streamUrl, downloadUrl])

  const handlePlayPause = async () => {
    if (!audioRef.current) {
      console.error('Audio ref is null')
      return
    }

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        console.log('Attempting to play audio from URL:', streamUrl)
        await audioRef.current.play()
        setIsPlaying(true)
        setAudioError(null)
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      setAudioError('Ошибка воспроизведения аудио')
      setIsPlaying(false)
    }
  }

  const handleEnded = () => {
    console.log('Audio playback ended')
    setIsPlaying(false)
  }

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audio = e.currentTarget
    console.error('Audio element error:', {
      error: audio.error,
      networkState: audio.networkState,
      readyState: audio.readyState,
      src: audio.src,
    })
    setAudioError(`Ошибка загрузки аудио (код: ${audio.error?.code})`)
    setIsPlaying(false)
  }

  const handleCanPlay = () => {
    console.log('Audio can play - ready to start')
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      console.log('Starting download from:', downloadUrl)

      // Скачиваем через прокси или напрямую
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      console.log('Downloaded blob size:', blob.size)

      // Создаем URL для blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Создаем временную ссылку и кликаем по ней
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Очищаем
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }, 100)

      console.log('Download completed successfully')
    } catch (error) {
      console.error('Error downloading audio:', error)
      alert('Ошибка при скачивании файла. Попробуйте еще раз.')
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
            src={streamUrl}
            onEnded={handleEnded}
            onError={handleError}
            onCanPlay={handleCanPlay}
            className="hidden"
            preload="metadata"
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
                {audioError ? (
                  <span className="text-destructive">{audioError}</span>
                ) : isPlaying ? (
                  'Воспроизведение...'
                ) : (
                  'Готово к воспроизведению'
                )}
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
              aria-label="Скачать аудио"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
