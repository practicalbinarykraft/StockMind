/**
 * Компонент интерактивного предпросмотра с Remotion Player
 * Использует @remotion/player для отображения композиции сцен
 */

import { Player, PlayerRef } from '@remotion/player'
import { useCompositionStore, selectSortedScenes } from '../../../stores/composition'
import { RemotionComposition } from './RemotionComposition'
import { Button } from '@/shared/ui/button'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import type { RefObject } from 'react'
import { Card } from '@/shared/ui/card'
import { Slider } from '@/shared/ui/slider'

interface RemotionPreviewProps {
  aspectRatio?: '16:9' | '9:16' | '1:1'
  className?: string
}

export function RemotionPreview({ 
  aspectRatio = '16:9',
  className 
}: RemotionPreviewProps) {
  const currentScene = useCompositionStore((state) => 
    state.currentSceneId ? state.scenes.get(state.currentSceneId) : undefined
  )
  const sortedScenes = useCompositionStore(selectSortedScenes)
  const setCurrentScene = useCompositionStore((state) => state.setCurrentScene)
  const playerRef = useRef<PlayerRef>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)

  // Расчет размеров canvas
  const getDimensions = useCallback(() => {
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

  const dimensions = getDimensions()
  const durationInFrames = currentScene?.durationInFrames || 300
  const fps = 30

  // Контролы плеера
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return
    
    if (isPlaying) {
      playerRef.current.pause()
    } else {
      playerRef.current.play()
    }
    setIsPlaying(!isPlaying)
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
    }
  }, [currentScene, sortedScenes, setCurrentScene])

  const handleNextScene = useCallback(() => {
    if (!currentScene) return
    const currentIndex = sortedScenes.findIndex(s => s.id === currentScene.id)
    if (currentIndex < sortedScenes.length - 1) {
      setCurrentScene(sortedScenes[currentIndex + 1].id)
      setCurrentFrame(0)
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
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Плеер */}
      <Card className="overflow-hidden">
        <Player
          ref={playerRef}
          component={RemotionComposition}
          inputProps={{
            scene: currentScene,
          }}
          durationInFrames={durationInFrames}
          compositionWidth={dimensions.width}
          compositionHeight={dimensions.height}
          fps={fps}
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: aspectRatio.replace(':', '/'),
          }}
          controls={false}
          loop
        />
      </Card>

      {/* Кастомные контролы */}
      <Card className="p-4 space-y-4">
        {/* Прогресс бар */}
        <div className="space-y-2">
          <Slider
            value={[currentFrame]}
            min={0}
            max={durationInFrames}
            step={1}
            onValueChange={handleSeek}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.floor(currentFrame / fps)}s</span>
            <span>{Math.floor(durationInFrames / fps)}s</span>
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
