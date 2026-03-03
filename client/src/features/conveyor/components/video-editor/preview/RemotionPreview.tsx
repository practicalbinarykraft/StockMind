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
import { Play, Pause, SkipBack, SkipForward, Loader2, AlertTriangle, RotateCcw } from 'lucide-react'
import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Card } from '@/shared/ui/card'
import { Slider } from '@/shared/ui/slider'
import { getProxiedVideoUrl } from '../../../utils/media-proxy'
import type { ScriptMedia } from '../../../services/scriptMediaService'
import type { EnhancedScene, BackgroundRemovalSettings } from '../../../types/layers'
import { getLayerStreamUrl } from '../../../types/layers'
import { useSegmentationPreprocess } from '../../../remotion/hooks/useSegmentationPreprocess'
import { SegmentationCacheProvider, type SegmentationCacheMap } from '../../../remotion/hooks/SegmentationCacheContext'

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
  // Подавление frame→scene синхронизации во время программного seekTo
  const suppressFrameToSceneRef = useRef(false)
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
  // Используем количество слов (не символов) — речь идёт пословно,
  // поэтому слова дают более точную пропорцию.
  const sceneDurations = useMemo(() => {
    if (sortedScenes.length === 0) return null
    const totalVideoDuration = media?.videoDuration
    if (!totalVideoDuration) return null

    const countWords = (text: string) =>
      text.trim().split(/\s+/).filter(Boolean).length || 1

    const totalVideoFrames = Math.ceil(totalVideoDuration * fps)
    const totalWords = sortedScenes.reduce(
      (sum, s) => sum + countWords(s.text || ''), 0
    )

    let usedFrames = 0
    return sortedScenes.map((scene, idx) => {
      if (idx === sortedScenes.length - 1) {
        return Math.max(totalVideoFrames - usedFrames, 1)
      }
      const proportion = countWords(scene.text || '') / totalWords
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

  // ── Предобработка сегментации ─────────────────────────────────────────────
  // Находим первый avatar/video с включённым bgRemoval — это будет
  // предобработан до воспроизведения (маски для мгновенного наложения).
  const segmentationTarget = useMemo(() => {
    for (const scene of adjustedScenes) {
      for (const layer of [scene.layers.background, scene.layers.overlay]) {
        if (!layer?.sourceUrl) continue
        const bgr = layer.metadata?.bgRemoval as BackgroundRemovalSettings | undefined
        if (bgr?.enabled && (layer.contentType === 'avatar' || layer.contentType === 'video')) {
          const src = layer.sourceUrl
          // Для MediaPipe нужен доступ к пикселям canvas → нужен CORS.
          // Внешние URL (CloudFront/R2) не отдают CORS-заголовки,
          // поэтому загружаем через серверный прокси (same-origin).
          const isExternal = !src.startsWith('/')
          const proxySrc = isExternal
            ? getLayerStreamUrl((layer as any).scriptId, layer.id)
            : src
          return { src, loadSrc: proxySrc, threshold: bgr.threshold, edgeBlur: bgr.edgeBlur }
        }
      }
    }
    return null
  }, [adjustedScenes])

  const segPreprocess = useSegmentationPreprocess({
    src: segmentationTarget?.src ?? null,
    loadSrc: segmentationTarget?.loadSrc,
    fps,
    threshold: segmentationTarget?.threshold ?? 0.5,
    edgeBlur: segmentationTarget?.edgeBlur ?? 0.15,
    enabled: !!segmentationTarget,
  })

  const segmentationCacheMap = useMemo<SegmentationCacheMap>(() => {
    const map: SegmentationCacheMap = new Map()
    if (segmentationTarget?.src && segPreprocess.maskCache.cache.size > 0) {
      map.set(segmentationTarget.src, segPreprocess.maskCache)
    }
    return map
  }, [segmentationTarget?.src, segPreprocess.maskCache, segPreprocess.status])

  const isSegmentationPending =
    !!segmentationTarget &&
    segPreprocess.status !== 'ready' &&
    segPreprocess.status !== 'error' &&
    segPreprocess.status !== 'idle'

  const totalDurationInFrames = useMemo(
    () => Math.max(adjustedScenes.reduce((sum, s) => sum + s.durationInFrames, 0), 1),
    [adjustedScenes]
  )

  // Корректировка позиции кадра при изменении общей длительности (пересчёт из video duration).
  // Без этого frame остаётся на месте, а маппинг frame→scene смещается и «прыгает» на другую сцену.
  const prevTotalDurationRef = useRef(0)

  useEffect(() => {
    const prevTotal = prevTotalDurationRef.current
    prevTotalDurationRef.current = totalDurationInFrames

    if (prevTotal === 0 || prevTotal === totalDurationInFrames) return
    if (!playerRef.current) return

    const ratio = currentFrame / prevTotal
    const newFrame = Math.min(
      Math.round(ratio * totalDurationInFrames),
      Math.max(totalDurationInFrames - 1, 0),
    )

    suppressFrameToSceneRef.current = true
    playerRef.current.seekTo(newFrame)
    setCurrentFrame(newFrame)
    requestAnimationFrame(() => {
      suppressFrameToSceneRef.current = false
    })
  }, [totalDurationInFrames])

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

  // ── sceneId → порядковый номер для отображения (1-based, по позиции в массиве) ──
  const sceneDisplayNumbers = useMemo(() => {
    const map = new Map<string, number>()
    adjustedScenes.forEach((s, i) => map.set(s.id, i + 1))
    return map
  }, [adjustedScenes])

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

    // Подавляем frame→scene синхронизацию на время seekTo,
    // чтобы onTimeUpdate со старым кадром не вернул нас на предыдущую сцену
    suppressFrameToSceneRef.current = true
    playerRef.current?.seekTo(startFrame)
    setCurrentFrame(startFrame)
    requestAnimationFrame(() => {
      suppressFrameToSceneRef.current = false
    })
  }, [currentSceneId, sceneStartFrames])

  // ── Подписка на события Player ──
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const onTimeUpdate = (e: { detail: { frame: number } }) => {
      const frame = e.detail.frame
      setCurrentFrame(frame)

      // Пропускаем frame→scene синхронизацию во время программного seekTo
      if (suppressFrameToSceneRef.current) return

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
      <Card className="overflow-hidden shrink min-h-0 flex items-center justify-center bg-black relative">
        <SegmentationCacheProvider value={segmentationCacheMap}>
          <Player
            ref={playerRef}
            component={SceneComposition as React.ComponentType<any>}
            inputProps={inputProps}
            durationInFrames={totalDurationInFrames}
            compositionWidth={dimensions.width}
            compositionHeight={dimensions.height}
            fps={fps}
            style={{
              maxWidth: '100%',
              maxHeight: '50vh',
              aspectRatio: aspectRatio.replace(':', '/'),
            }}
            controls={false}
            loop
          />
        </SegmentationCacheProvider>

        {isSegmentationPending && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-white">
                {segPreprocess.status === 'loading-model'
                  ? 'Загрузка модели сегментации...'
                  : `Обработка кадров: ${segPreprocess.processedFrames} из ${segPreprocess.totalFrames}`}
              </p>
              {segPreprocess.status === 'processing' && (
                <div className="w-48 mx-auto">
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(segPreprocess.progress * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-1">
                    {Math.round(segPreprocess.progress * 100)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {segPreprocess.status === 'error' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-white">Ошибка сегментации</p>
              <p className="text-xs text-white/60 max-w-[200px]">{segPreprocess.error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={segPreprocess.retry}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Повторить
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-3 space-y-2 shrink-0">
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
              Сцена {currentSceneFromFrame ? sceneDisplayNumbers.get(currentSceneFromFrame.scene.id) ?? '—' : '—'}: {sceneRelativeTime}s / {sceneFullDuration}s
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
