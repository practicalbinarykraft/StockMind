/**
 * Компонент интерактивного предпросмотра с Remotion Player
 * Использует @remotion/player для отображения композиции сцен
 */

import { Player, PlayerRef } from '@remotion/player'
import { useCompositionStore, selectSortedScenes, selectCurrentScene } from '../../../stores/composition'
import { RemotionComposition } from './RemotionComposition'
import { Button } from '@/shared/ui/button'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Card } from '@/shared/ui/card'
import { Slider } from '@/shared/ui/slider'
import { getProxiedVideoUrl } from '../../../utils/media-proxy'
import type { ScriptMedia } from '../../../services/scriptMediaService'

interface RemotionPreviewProps {
  aspectRatio?: '16:9' | '9:16' | '1:1'
  className?: string
  media?: ScriptMedia | null
}

export function RemotionPreview({ 
  aspectRatio = '16:9',
  className,
  media,
}: RemotionPreviewProps) {
  const currentScene = useCompositionStore(selectCurrentScene)
  const sortedScenes = useCompositionStore(selectSortedScenes)
  const setCurrentScene = useCompositionStore((state) => state.setCurrentScene)
  const playerRef = useRef<PlayerRef>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)

  const dimensions = useMemo(() => {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1920, height: 1080 }
      case '9:16':
        return { width: 1080, height: 1920 }
      case '1:1':
        return { width: 1080, height: 1080 }
      default:
        return { width: 1920, height: 1080 }
    }
  }, [aspectRatio])

  const durationInFrames = Math.max(currentScene?.durationInFrames || 300, 1)
  const fps = 30

  const avatarVideoUrl = useMemo(
    () => getProxiedVideoUrl(media?.videoUrl) || undefined,
    [media?.videoUrl]
  )

  const inputProps = useMemo(() => ({
    scene: currentScene!,
    avatarVideoUrl,
  }), [currentScene, avatarVideoUrl])

  // Player пересоздаётся через key={currentScene.id}, сбрасываем UI-состояние
  useEffect(() => {
    setCurrentFrame(0)
    setIsPlaying(false)
  }, [currentScene?.id])

  // Синхронизация состояния плеера с UI
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const handleTimeUpdate = (e: { detail: { frame: number } }) => {
      setCurrentFrame(e.detail.frame)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentFrame(0)
    }

    player.addEventListener('timeupdate', handleTimeUpdate as any)
    player.addEventListener('play', handlePlay as any)
    player.addEventListener('pause', handlePause as any)
    player.addEventListener('ended', handleEnded as any)

    return () => {
      player.removeEventListener('timeupdate', handleTimeUpdate as any)
      player.removeEventListener('play', handlePlay as any)
      player.removeEventListener('pause', handlePause as any)
      player.removeEventListener('ended', handleEnded as any)
    }
  }, [currentScene?.id])

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return
    
    if (isPlaying) {
      playerRef.current.pause()
    } else {
      playerRef.current.play()
    }
  }, [isPlaying])

  const handleSeek = useCallback((value: number[]) => {
    if (!playerRef.current) return
    const frame = value[0]
    playerRef.current.seekTo(frame)
    setCurrentFrame(frame)
  }, [])

  const handlePrevScene = useCallback(() => {
    if (!currentScene) return
    const currentIndex = sortedScenes.findIndex(s => s.id === currentScene.id)
    if (currentIndex > 0) {
      setCurrentScene(sortedScenes[currentIndex - 1].id)
      setCurrentFrame(0)
      playerRef.current?.seekTo(0)
    }
  }, [currentScene, sortedScenes, setCurrentScene])

  const handleNextScene = useCallback(() => {
    if (!currentScene) return
    const currentIndex = sortedScenes.findIndex(s => s.id === currentScene.id)
    if (currentIndex < sortedScenes.length - 1) {
      setCurrentScene(sortedScenes[currentIndex + 1].id)
      setCurrentFrame(0)
      playerRef.current?.seekTo(0)
    }
  }, [currentScene, sortedScenes, setCurrentScene])

  if (!currentScene) {
    return (
      <Card className={`flex items-center justify-center bg-muted ${className}`}>
        <p className="text-muted-foreground">Выберите сцену для предпросмотра</p>
      </Card>
    )
  }

  return (
    <div className={`flex flex-col gap-2 min-h-0 ${className}`}>
      {/* Плеер — key по sceneId принудительно пересоздаёт Player при смене сцены */}
      <Card className="overflow-hidden flex-shrink min-h-0 flex items-center justify-center bg-black">
        <Player
          key={currentScene.id}
          ref={playerRef}
          component={RemotionComposition as React.ComponentType<any>}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={dimensions.width}
          compositionHeight={dimensions.height}
          fps={fps}
          style={{
            width: '100%',
            maxHeight: '50vh',
            aspectRatio: aspectRatio.replace(':', '/'),
          }}
          controls={false}
          loop
        />
      </Card>

      {/* Кастомные контролы */}
      <Card className="p-3 space-y-2 flex-shrink-0">
        {/* Прогресс бар */}
        <div className="space-y-1">
          <Slider
            value={[currentFrame]}
            min={0}
            max={durationInFrames}
            step={1}
            onValueChange={handleSeek}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{(currentFrame / fps).toFixed(1)}s</span>
            <span>{(durationInFrames / fps).toFixed(1)}s</span>
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevScene}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={togglePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNextScene}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
