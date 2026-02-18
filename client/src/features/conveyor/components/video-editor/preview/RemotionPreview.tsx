/**
 * Компонент интерактивного предпросмотра с Remotion Player
 * Единый Player для всех сцен — видео загружается один раз,
 * переключение сцен через seekTo без пересоздания Player.
 *
 * Синхронизация frame↔scene:
 *  - frame→scene: обновляем currentSceneId в timeupdate/handleSeek (через lastSyncedSceneRef)
 *  - scene→frame: useEffect ловит внешние изменения currentSceneId (клик по ScenesList)
 *    и seekTo к началу сцены. lastSyncedSceneRef предотвращает петлю.
 */

import React from 'react'
import { Player, PlayerRef } from '@remotion/player'
import { useCompositionStore, selectSortedScenes } from '../../../stores/composition'
import { SceneComposition } from '../../../remotion/SceneComposition'
import { getCurrentScene } from '../../../remotion/Root'
import { Button } from '@/shared/ui/button'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Card } from '@/shared/ui/card'
import { Slider } from '@/shared/ui/slider'
import { getProxiedVideoUrl } from '../../../utils/media-proxy'
import type { ScriptMedia } from '../../../services/scriptMediaService'
import type { EnhancedScene } from '../../../types/layers'

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
  const sortedScenes = useCompositionStore(selectSortedScenes)
  const currentSceneId = useCompositionStore((state) => state.currentSceneId)
  const setCurrentScene = useCompositionStore((state) => state.setCurrentScene)
  const playerRef = useRef<PlayerRef>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)

  // Ref для предотвращения циклической синхронизации frame↔scene
  const lastSyncedSceneRef = useRef<string | null>(null)
  // Ref для актуальных сцен внутри event-handler'ов (избегаем stale closure)
  const adjustedScenesRef = useRef<EnhancedScene[]>([])

  const fps = 30

  const dimensions = useMemo(() => {
    switch (aspectRatio) {
      case '16:9': return { width: 1920, height: 1080 }
      case '9:16': return { width: 1080, height: 1920 }
      case '1:1': return { width: 1080, height: 1080 }
      default: return { width: 1920, height: 1080 }
    }
  }, [aspectRatio])

  const avatarVideoUrl = useMemo(
    () => getProxiedVideoUrl(media?.videoUrl) || undefined,
    [media?.videoUrl]
  )

  // ── Пропорциональное распределение длительности видео по сценам ──
  const sceneDurations = useMemo(() => {
    if (sortedScenes.length === 0) return null
    const totalVideoDuration = media?.videoDuration
    if (!totalVideoDuration) return null

    const totalVideoFrames = Math.ceil(totalVideoDuration * fps)
    const totalTextLength = sortedScenes.reduce(
      (sum, s) => sum + (s.text?.length || 1), 0
    )

    let usedFrames = 0
    return sortedScenes.map((scene, idx) => {
      if (idx === sortedScenes.length - 1) {
        return Math.max(totalVideoFrames - usedFrames, 1)
      }
      const proportion = (scene.text?.length || 1) / totalTextLength
      const frames = Math.max(Math.round(totalVideoFrames * proportion), 1)
      usedFrames += frames
      return frames
    })
  }, [media?.videoDuration, sortedScenes, fps])

  // ── Сцены с разрешёнными URL аватара и пропорциональными длительностями ──
  const adjustedScenes: EnhancedScene[] = useMemo(() => {
    const resolveLayer = <T extends { sourceUrl?: string; contentType: string }>(
      layer: T | undefined
    ): T | undefined => {
      if (!layer) return undefined
      if (layer.sourceUrl || layer.contentType !== 'avatar' || !avatarVideoUrl) return layer
      return { ...layer, sourceUrl: avatarVideoUrl }
    }

    return sortedScenes.map((scene, idx) => ({
      ...scene,
      durationInFrames: sceneDurations ? sceneDurations[idx] : scene.durationInFrames,
      layers: {
        ...scene.layers,
        background: resolveLayer(scene.layers.background),
        overlay: resolveLayer(scene.layers.overlay),
      },
    }))
  }, [sortedScenes, sceneDurations, avatarVideoUrl])

  // Держим ref в актуальном состоянии для event-handler'ов
  adjustedScenesRef.current = adjustedScenes

  const totalDurationInFrames = useMemo(
    () => Math.max(adjustedScenes.reduce((sum, s) => sum + s.durationInFrames, 0), 1),
    [adjustedScenes]
  )

  // ── sceneId → стартовый кадр ──
  const sceneStartFrames = useMemo(() => {
    const map = new Map<string, number>()
    let frame = 0
    for (const scene of adjustedScenes) {
      map.set(scene.id, frame)
      frame += scene.durationInFrames
    }
    return map
  }, [adjustedScenes])

  // ── Текущая сцена по позиции кадра (для отображения в UI) ──
  const currentSceneFromFrame = useMemo(
    () => getCurrentScene(adjustedScenes, currentFrame),
    [adjustedScenes, currentFrame]
  )

  // ── Синхронизация: scene→frame ──
  // Ловит внешние изменения currentSceneId (клик по ScenesList, prev/next кнопки)
  // и делает seekTo к началу сцены. Пропускает, если изменение пришло
  // из нашего собственного frame→scene обновления (lastSyncedSceneRef совпадает).
  useEffect(() => {
    if (!currentSceneId) return
    if (currentSceneId === lastSyncedSceneRef.current) return

    lastSyncedSceneRef.current = currentSceneId
    const startFrame = sceneStartFrames.get(currentSceneId)
    if (startFrame === undefined) return

    playerRef.current?.seekTo(startFrame)
    setCurrentFrame(startFrame)
  }, [currentSceneId, sceneStartFrames])

  // ── Подписка на события Player ──
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const onTimeUpdate = (e: { detail: { frame: number } }) => {
      const frame = e.detail.frame
      setCurrentFrame(frame)

      // frame→scene синхронизация: определяем сцену по кадру
      const sceneAtFrame = getCurrentScene(adjustedScenesRef.current, frame)
      if (sceneAtFrame && sceneAtFrame.scene.id !== lastSyncedSceneRef.current) {
        lastSyncedSceneRef.current = sceneAtFrame.scene.id
        setCurrentScene(sceneAtFrame.scene.id)
      }
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)

    player.addEventListener('timeupdate', onTimeUpdate as any)
    player.addEventListener('play', onPlay as any)
    player.addEventListener('pause', onPause as any)
    player.addEventListener('ended', onEnded as any)

    return () => {
      player.removeEventListener('timeupdate', onTimeUpdate as any)
      player.removeEventListener('play', onPlay as any)
      player.removeEventListener('pause', onPause as any)
      player.removeEventListener('ended', onEnded as any)
    }
  }, [totalDurationInFrames, setCurrentScene])

  // ── Управление воспроизведением ──
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

    // frame→scene синхронизация при ручной перемотке
    const sceneAtFrame = getCurrentScene(adjustedScenesRef.current, frame)
    if (sceneAtFrame) {
      lastSyncedSceneRef.current = sceneAtFrame.scene.id
      setCurrentScene(sceneAtFrame.scene.id)
    }
  }, [setCurrentScene])

  const handlePrevScene = useCallback(() => {
    if (!currentSceneId || adjustedScenes.length === 0) return
    const idx = adjustedScenes.findIndex(s => s.id === currentSceneId)
    if (idx > 0) {
      setCurrentScene(adjustedScenes[idx - 1].id)
    }
  }, [currentSceneId, adjustedScenes, setCurrentScene])

  const handleNextScene = useCallback(() => {
    if (!currentSceneId || adjustedScenes.length === 0) return
    const idx = adjustedScenes.findIndex(s => s.id === currentSceneId)
    if (idx < adjustedScenes.length - 1) {
      setCurrentScene(adjustedScenes[idx + 1].id)
    }
  }, [currentSceneId, adjustedScenes, setCurrentScene])

  // ── Пустое состояние ──
  if (adjustedScenes.length === 0) {
    return (
      <Card className={`flex items-center justify-center bg-muted ${className}`}>
        <p className="text-muted-foreground">Нет сцен для предпросмотра</p>
      </Card>
    )
  }

  const inputProps = useMemo(
    () => ({ scenes: adjustedScenes }),
    [adjustedScenes]
  )

  const sliderMax = Math.max(totalDurationInFrames - 1, 0)

  const sceneRelativeTime = currentSceneFromFrame
    ? ((currentFrame - currentSceneFromFrame.sceneStartFrame) / fps).toFixed(1)
    : '0.0'
  const sceneFullDuration = currentSceneFromFrame
    ? (currentSceneFromFrame.scene.durationInFrames / fps).toFixed(1)
    : '0.0'

  return (
    <div className={`flex flex-col gap-2 min-h-0 ${className}`}>
      <Card className="overflow-hidden flex-shrink min-h-0 flex items-center justify-center bg-black">
        <Player
          ref={playerRef}
          component={SceneComposition as React.ComponentType<any>}
          inputProps={inputProps}
          durationInFrames={totalDurationInFrames}
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

      <Card className="p-3 space-y-2 flex-shrink-0">
        <div className="space-y-1">
          <Slider
            value={[currentFrame]}
            min={0}
            max={sliderMax}
            step={1}
            onValueChange={handleSeek}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{(currentFrame / fps).toFixed(1)}s</span>
            <span>
              Сцена {currentSceneFromFrame?.scene.order ?? '—'}: {sceneRelativeTime}s / {sceneFullDuration}s
            </span>
            <span>{(totalDurationInFrames / fps).toFixed(1)}s</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevScene}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="default" size="icon" onClick={togglePlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextScene}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
