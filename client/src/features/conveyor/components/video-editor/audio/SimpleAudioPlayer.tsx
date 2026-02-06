/**
 * Упрощённый аудио плеер для conveyor
 * ≤80 строк
 */

import { useRef, useState } from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Play, Pause, Download } from 'lucide-react'

interface SimpleAudioPlayerProps {
  audioUrl: string
  filename?: string
}

export function SimpleAudioPlayer({ audioUrl, filename = 'audio.mp3' }: SimpleAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

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

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = filename
    link.click()
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

            <div className="flex-1 text-sm text-muted-foreground">
              {isPlaying ? 'Воспроизведение...' : 'Готово к воспроизведению'}
            </div>

            <Button variant="outline" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
