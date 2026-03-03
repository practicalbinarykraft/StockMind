/**
 * Вкладка для настройки визуалов (background и overlay)
 * Поддерживает генерацию контента через Kie.ai, HeyGen (аватар) и загрузку файлов
 */

import { useState, useCallback, useRef } from 'react'
import { useLocation } from 'wouter'
import { useCompositionStore, selectCurrentScene, selectScenesCount } from '../../../stores/composition'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Separator } from '@/shared/ui/separator'
import { Badge } from '@/shared/ui/badge'
import { Upload, Sparkles, Image as ImageIcon, Video as VideoIcon, User, ExternalLink, CheckCircle, Move, ArrowUpDown, Maximize, Copy, Trash2, Plus, X, Eraser } from 'lucide-react'
import { Slider } from '@/shared/ui/slider'
import { KieAiDialog } from '../generation/KieAiDialog'
import { GenerationStatusCard } from '../generation/GenerationStatusCard'
import { useToast } from '@/shared/hooks/use-toast'
import { getProxiedVideoUrl } from '../../../utils/media-proxy'
import type { ContentType, OverlayObjectFit, ChromaKeySettings } from '../../../types/layers'
import { DEFAULT_CHROMA_KEY_SETTINGS } from '../../../types/layers'
import type { ScriptMedia } from '../../../services/scriptMediaService'

interface VisualsTabProps {
  scriptId?: string
  media?: ScriptMedia | null
}

export function VisualsTab({ scriptId, media }: VisualsTabProps) {
  const [, navigate] = useLocation()
  const currentScene = useCompositionStore(selectCurrentScene)
  const storeScriptId = useCompositionStore((state) => state.scriptId)
  const updateBackgroundLayer = useCompositionStore((state) => state.updateBackgroundLayer)
  const updateOverlayLayer = useCompositionStore((state) => state.updateOverlayLayer)
  const uploadFile = useCompositionStore((state) => state.uploadFile)
  const applyLayerToAllScenes = useCompositionStore((state) => state.applyLayerToAllScenes)
  const removeLayerFromOtherScenes = useCompositionStore((state) => state.removeLayerFromOtherScenes)
  const uploadFileToAllScenes = useCompositionStore((state) => state.uploadFileToAllScenes)
  const removeLayer = useCompositionStore((state) => state.removeLayer)
  const addLayer = useCompositionStore((state) => state.addLayer)
  const scenesCount = useCompositionStore(selectScenesCount)
  const { toast } = useToast()

  const [showGenerationDialog, setShowGenerationDialog] = useState(false)
  const [currentLayerType, setCurrentLayerType] = useState<'background' | 'overlay'>('background')

  const backgroundLayer = currentScene?.layers.background
  const overlayLayer = currentScene?.layers.overlay

  const effectiveScriptId = scriptId || storeScriptId

  if (!currentScene) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Выберите сцену для настройки визуалов
      </div>
    )
  }

  const handleContentTypeChange = (layerType: 'background' | 'overlay', contentType: ContentType) => {
    const layer = layerType === 'background' ? backgroundLayer : overlayLayer
    const currentContentType = layer?.contentType

    if (currentContentType === contentType) return

    const savedUrls: Record<string, string> = { ...(layer?.metadata?.savedUrls || {}) }
    if (layer?.sourceUrl && currentContentType) {
      savedUrls[currentContentType] = layer.sourceUrl
    }

    const restoredUrl = savedUrls[contentType] as string | undefined

    const updates = {
      contentType,
      sourceUrl: restoredUrl,
      metadata: { ...(layer?.metadata || {}), savedUrls },
      generationStatus: undefined as any,
      generationJobId: undefined as string | undefined,
      generationPrompt: undefined as string | undefined,
    }

    if (layerType === 'background') {
      updateBackgroundLayer(currentScene.id, updates)
    } else if (layerType === 'overlay') {
      updateOverlayLayer(currentScene.id, updates)
    }
  }

  const handleGenerateClick = (layerType: 'background' | 'overlay') => {
    setCurrentLayerType(layerType)
    setShowGenerationDialog(true)
  }

  const handleUploadClick = async (layerType: 'background' | 'overlay') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        await uploadFile(currentScene.id, layerType, file)
        toast({
          title: 'Файл загружен',
          description: `Файл успешно загружен для слоя ${layerType}`,
        })
      } catch (error) {
        console.error('Upload failed:', error)
        toast({
          title: 'Ошибка загрузки',
          description: error instanceof Error ? error.message : 'Не удалось загрузить файл',
          variant: 'destructive',
        })
      }
    }

    input.click()
  }

  const handleNavigateToAvatar = () => {
    if (effectiveScriptId) {
      navigate(`/conveyor/video-editor/${effectiveScriptId}/avatar`)
    }
  }

  const handleSwapLayers = () => {
    const bgData = {
      contentType: backgroundLayer?.contentType || ('image' as ContentType),
      sourceUrl: backgroundLayer?.sourceUrl,
      generationStatus: backgroundLayer?.generationStatus,
      generationJobId: backgroundLayer?.generationJobId,
      generationPrompt: backgroundLayer?.generationPrompt,
      metadata: backgroundLayer?.metadata,
    }
    const olData = {
      contentType: overlayLayer?.contentType || ('image' as ContentType),
      sourceUrl: overlayLayer?.sourceUrl,
      generationStatus: overlayLayer?.generationStatus,
      generationJobId: overlayLayer?.generationJobId,
      generationPrompt: overlayLayer?.generationPrompt,
      metadata: overlayLayer?.metadata,
    }

    updateBackgroundLayer(currentScene.id, {
      contentType: olData.contentType,
      sourceUrl: olData.sourceUrl,
      generationStatus: olData.generationStatus as any,
      generationJobId: olData.generationJobId,
      generationPrompt: olData.generationPrompt,
      metadata: olData.metadata,
    })
    updateOverlayLayer(currentScene.id, {
      contentType: bgData.contentType,
      sourceUrl: bgData.sourceUrl,
      generationStatus: bgData.generationStatus as any,
      generationJobId: bgData.generationJobId,
      generationPrompt: bgData.generationPrompt,
      metadata: bgData.metadata,
    })

    toast({
      title: 'Слои переключены',
      description: 'Контент фонового и overlay слоёв поменялся местами',
    })
  }

  const handleApplyToAllScenes = async (layerType: 'background' | 'overlay') => {
    try {
      const layer = layerType === 'background' ? backgroundLayer : overlayLayer
      await applyLayerToAllScenes(currentScene.id, layerType)
      const count = scenesCount - 1
      toast({
        title: 'Применено ко всем сценам',
        description: `${layer?.contentType === 'video' ? 'Видео' : 'Изображение'} скопировано на ${count} ${count === 1 ? 'сцену' : count < 5 ? 'сцены' : 'сцен'}`,
      })
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось применить ко всем сценам', variant: 'destructive' })
    }
  }

  const handleRemoveFromOtherScenes = async (layerType: 'background' | 'overlay') => {
    try {
      await removeLayerFromOtherScenes(currentScene.id, layerType)
      const count = scenesCount - 1
      toast({
        title: 'Удалено с других сцен',
        description: `Слой удалён с ${count} ${count === 1 ? 'сцены' : count < 5 ? 'сцен' : 'сцен'}`,
      })
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить слои', variant: 'destructive' })
    }
  }

  const handleRemoveLayer = async (layerType: 'background' | 'overlay') => {
    try {
      await removeLayer(currentScene.id, layerType)
      toast({
        title: 'Слой удалён',
        description: `${layerType === 'background' ? 'Фоновый' : 'Overlay'} слой удалён с текущей сцены`,
      })
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить слой', variant: 'destructive' })
    }
  }

  const handleAddLayer = async (layerType: 'background' | 'overlay') => {
    try {
      await addLayer(currentScene.id, layerType)
      toast({
        title: 'Слой добавлен',
        description: `${layerType === 'background' ? 'Фоновый' : 'Overlay'} слой добавлен на текущую сцену`,
      })
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить слой', variant: 'destructive' })
    }
  }

  const handleUploadToAllScenes = async (layerType: 'background' | 'overlay') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        await uploadFileToAllScenes(layerType, file)
        toast({
          title: 'Файл загружен на все сцены',
          description: file.type.startsWith('video/')
            ? 'Видео распределено по сценам с учётом их длительности'
            : 'Изображение применено ко всем сценам',
        })
      } catch (error) {
        console.error('Upload to all scenes failed:', error)
        toast({
          title: 'Ошибка загрузки',
          description: error instanceof Error ? error.message : 'Не удалось загрузить файл на все сцены',
          variant: 'destructive',
        })
      }
    }

    input.click()
  }

  const bgVideoRef = useRef<HTMLVideoElement>(null)
  const olVideoRef = useRef<HTMLVideoElement>(null)
  const bgRetryCount = useRef(0)
  const olRetryCount = useRef(0)
  const MAX_VIDEO_RETRIES = 3

  const handleVideoError = useCallback((
    ref: React.RefObject<HTMLVideoElement | null>,
    retryCountRef: React.MutableRefObject<number>,
    label: string,
  ) => {
    if (retryCountRef.current < MAX_VIDEO_RETRIES) {
      retryCountRef.current++
      const delay = 1000 * retryCountRef.current
      console.warn(`[${label}] Video load failed, retry ${retryCountRef.current}/${MAX_VIDEO_RETRIES} in ${delay}ms`)
      setTimeout(() => {
        if (ref.current) {
          ref.current.load()
        }
      }, delay)
    } else {
      console.error(`[${label}] Video failed after ${MAX_VIDEO_RETRIES} retries`)
      toast({
        title: 'Ошибка загрузки видео',
        description: 'Не удалось загрузить видео. Попробуйте обновить страницу.',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleVideoLoaded = useCallback((retryCountRef: React.MutableRefObject<number>) => {
    retryCountRef.current = 0
  }, [])

  const bgContentType = backgroundLayer?.contentType || 'image'
  const olContentType = overlayLayer?.contentType || 'image'

  return (
    <div className="space-y-6 min-w-0">
      {/* Информация об аватаре (HeyGen) */}
      {media?.videoUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight truncate">
                  {media.selectedAvatar || 'Аватар'}
                </h3>
                <p className="text-xs text-muted-foreground">HeyGen аватар</p>
              </div>
            </div>
            <Badge variant="default" className="gap-1 text-xs">
              <CheckCircle className="h-3 w-3" />
              Готово
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleNavigateToAvatar}
          >
            <User className="h-4 w-4 mr-2" />
            Изменить аватар
          </Button>
          <Separator />
        </div>
      )}

      {/* Background Layer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Фоновый слой</h3>
            <p className="text-sm text-muted-foreground">
              Основной визуальный контент сцены
            </p>
          </div>
          {backgroundLayer ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveLayer('background')}
              title="Удалить слой"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {!backgroundLayer ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleAddLayer('background')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить фоновый слой
          </Button>
        ) : (
          <>
            <div className="space-y-3">
              <Label>Тип контента</Label>
              <RadioGroup
                value={bgContentType}
                onValueChange={(value) => handleContentTypeChange('background', value as ContentType)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avatar" id="bg-avatar" />
                  <Label htmlFor="bg-avatar" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Аватар
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="bg-image" />
                  <Label htmlFor="bg-image" className="flex items-center gap-2 cursor-pointer">
                    <ImageIcon className="h-4 w-4" />
                    Изображение
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="bg-video" />
                  <Label htmlFor="bg-video" className="flex items-center gap-2 cursor-pointer">
                    <VideoIcon className="h-4 w-4" />
                    Видео
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {bgContentType === 'avatar' ? (
              <>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleNavigateToAvatar}
                >
                  <User className="h-4 w-4 mr-2" />
                  Выбрать аватар (HeyGen)
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
                <ChromaKeyControls
                  layer={backgroundLayer}
                  sceneId={currentScene.id}
                  onUpdate={(updates) => updateBackgroundLayer(currentScene.id, updates)}
                  hasGreenScreen={!!media?.compositionSettings?.greenScreen}
                />
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleGenerateClick('background')}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Генерировать
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleUploadClick('background')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить
                  </Button>
                </div>
                {bgContentType === 'video' && backgroundLayer?.sourceUrl && !backgroundLayer?.generationStatus && (
                  <ChromaKeyControls
                    layer={backgroundLayer}
                    sceneId={currentScene.id}
                    onUpdate={(updates) => updateBackgroundLayer(currentScene.id, updates)}
                    hasGreenScreen={true}
                  />
                )}
              </>
            )}

            {backgroundLayer?.generationStatus && (
              <GenerationStatusCard
                status={backgroundLayer.generationStatus}
                jobId={backgroundLayer.generationJobId}
                resultUrl={backgroundLayer.sourceUrl}
                contentType={backgroundLayer.contentType}
                layerType="background"
                sceneId={currentScene.id}
              />
            )}

            {(() => {
              const avatarUrl = bgContentType === 'avatar' ? getProxiedVideoUrl(media?.videoUrl) : undefined
              const previewUrl = backgroundLayer?.sourceUrl || avatarUrl
              if (!previewUrl || backgroundLayer?.generationStatus) return null
              return (
                <div className="aspect-video rounded-md overflow-hidden border">
                  {bgContentType === 'video' || bgContentType === 'avatar' ? (
                    <video
                      ref={bgVideoRef}
                      src={previewUrl}
                      className={`w-full h-full ${bgContentType === 'avatar' ? 'object-contain bg-black' : 'object-cover'}`}
                      controls
                      muted
                      preload={bgContentType === 'avatar' ? 'auto' : 'metadata'}
                      onError={() => handleVideoError(bgVideoRef, bgRetryCount, 'BG')}
                      onLoadedData={() => handleVideoLoaded(bgRetryCount)}
                    />
                  ) : (
                    <img src={previewUrl} alt="Background" className="w-full h-full object-cover" />
                  )}
                </div>
              )
            })()}

            {bgContentType !== 'avatar' && scenesCount > 1 && (
              <div className="space-y-2">
                {backgroundLayer?.sourceUrl && !backgroundLayer?.generationStatus && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleApplyToAllScenes('background')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Применить ко всем сценам
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => handleRemoveFromOtherScenes('background')}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить со всех кроме текущей
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUploadToAllScenes('background')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить на все сцены
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative py-1">
        <Separator />
        {backgroundLayer && overlayLayer && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 bg-background text-xs"
              onClick={handleSwapLayers}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Поменять местами
            </Button>
          </div>
        )}
      </div>

      {/* Overlay Layer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Overlay слой</h3>
            <p className="text-sm text-muted-foreground">
              Дополнительный контент поверх фона
            </p>
          </div>
          {overlayLayer ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveLayer('overlay')}
              title="Удалить слой"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {!overlayLayer ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleAddLayer('overlay')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить overlay слой
          </Button>
        ) : (
          <>
            <div className="space-y-3">
              <Label>Тип контента</Label>
              <RadioGroup
                value={olContentType}
                onValueChange={(value) => handleContentTypeChange('overlay', value as ContentType)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avatar" id="ol-avatar" />
                  <Label htmlFor="ol-avatar" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Аватар
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="ol-image" />
                  <Label htmlFor="ol-image" className="flex items-center gap-2 cursor-pointer">
                    <ImageIcon className="h-4 w-4" />
                    Изображение
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="ol-video" />
                  <Label htmlFor="ol-video" className="flex items-center gap-2 cursor-pointer">
                    <VideoIcon className="h-4 w-4" />
                    Видео
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {olContentType === 'avatar' ? (
              <>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleNavigateToAvatar}
                >
                  <User className="h-4 w-4 mr-2" />
                  Выбрать аватар (HeyGen)
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
                <ChromaKeyControls
                  layer={overlayLayer}
                  sceneId={currentScene.id}
                  onUpdate={(updates) => updateOverlayLayer(currentScene.id, updates)}
                  hasGreenScreen={!!media?.compositionSettings?.greenScreen}
                />
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleGenerateClick('overlay')}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Генерировать
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleUploadClick('overlay')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Загрузить
                  </Button>
                </div>
                {olContentType === 'video' && overlayLayer?.sourceUrl && !overlayLayer?.generationStatus && (
                  <ChromaKeyControls
                    layer={overlayLayer}
                    sceneId={currentScene.id}
                    onUpdate={(updates) => updateOverlayLayer(currentScene.id, updates)}
                    hasGreenScreen={true}
                  />
                )}
              </>
            )}

            {overlayLayer?.generationStatus && (
              <GenerationStatusCard
                status={overlayLayer.generationStatus}
                jobId={overlayLayer.generationJobId}
                resultUrl={overlayLayer.sourceUrl}
                contentType={overlayLayer.contentType}
                layerType="overlay"
                sceneId={currentScene.id}
              />
            )}

            {(() => {
              const avatarUrl = olContentType === 'avatar' ? getProxiedVideoUrl(media?.videoUrl) : undefined
              const previewUrl = overlayLayer?.sourceUrl || avatarUrl
              if (!previewUrl || overlayLayer?.generationStatus) return null
              return (
                <div className="aspect-video rounded-md overflow-hidden border">
                  {olContentType === 'video' || olContentType === 'avatar' ? (
                    <video
                      ref={olVideoRef}
                      src={previewUrl}
                      className={`w-full h-full ${olContentType === 'avatar' ? 'object-contain bg-black' : 'object-cover'}`}
                      controls
                      muted
                      preload={olContentType === 'avatar' ? 'auto' : 'metadata'}
                      onError={() => handleVideoError(olVideoRef, olRetryCount, 'OL')}
                      onLoadedData={() => handleVideoLoaded(olRetryCount)}
                    />
                  ) : (
                    <img src={previewUrl} alt="Overlay" className="w-full h-full object-cover" />
                  )}
                </div>
              )
            })()}

            {olContentType !== 'avatar' && scenesCount > 1 && (
              <div className="space-y-2">
                {overlayLayer?.sourceUrl && !overlayLayer?.generationStatus && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleApplyToAllScenes('overlay')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Применить ко всем сценам
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => handleRemoveFromOtherScenes('overlay')}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить со всех кроме текущей
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUploadToAllScenes('overlay')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить на все сцены
                </Button>
              </div>
            )}
            <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Move className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Позиция и размер</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">X: {Math.round(overlayLayer.position?.x ?? 25)}%</Label>
                <Slider
                  value={[overlayLayer.position?.x ?? 25]}
                  min={0}
                  max={100 - (overlayLayer.position?.width ?? 50)}
                  step={1}
                  onValueChange={([v]) => {
                    const pos = overlayLayer.position ?? { x: 25, y: 25, width: 50, height: 50 }
                    updateOverlayLayer(currentScene.id, {
                      position: { ...pos, x: v },
                    })
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Y: {Math.round(overlayLayer.position?.y ?? 25)}%</Label>
                <Slider
                  value={[overlayLayer.position?.y ?? 25]}
                  min={0}
                  max={100 - (overlayLayer.position?.height ?? 50)}
                  step={1}
                  onValueChange={([v]) => {
                    const pos = overlayLayer.position ?? { x: 25, y: 25, width: 50, height: 50 }
                    updateOverlayLayer(currentScene.id, {
                      position: { ...pos, y: v },
                    })
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ширина: {Math.round(overlayLayer.position?.width ?? 50)}%</Label>
                <Slider
                  value={[overlayLayer.position?.width ?? 50]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={([v]) => {
                    const pos = overlayLayer.position ?? { x: 25, y: 25, width: 50, height: 50 }
                    updateOverlayLayer(currentScene.id, {
                      position: { ...pos, width: v },
                    })
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Высота: {Math.round(overlayLayer.position?.height ?? 50)}%</Label>
                <Slider
                  value={[overlayLayer.position?.height ?? 50]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={([v]) => {
                    const pos = overlayLayer.position ?? { x: 25, y: 25, width: 50, height: 50 }
                    updateOverlayLayer(currentScene.id, {
                      position: { ...pos, height: v },
                    })
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Maximize className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Заполнение</Label>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { value: 'contain' as OverlayObjectFit, label: 'Вписать' },
                  { value: 'cover' as OverlayObjectFit, label: 'Заполнить' },
                  { value: 'fill' as OverlayObjectFit, label: 'Растянуть' },
                ] as const).map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={( overlayLayer.objectFit || 'contain') === value ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      updateOverlayLayer(currentScene.id, { objectFit: value })
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {(overlayLayer.objectFit || 'contain') === 'contain' && 'Контент целиком, могут быть пустые области'}
                {overlayLayer.objectFit === 'cover' && 'Заполнит область, контент может обрезаться'}
                {overlayLayer.objectFit === 'fill' && 'Растянет контент до размеров области'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Пресеты</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    updateOverlayLayer(currentScene.id, {
                      position: { x: 0, y: 0, width: 100, height: 100 },
                    })
                  }}
                >
                  Весь экран
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    updateOverlayLayer(currentScene.id, {
                      position: { x: 25, y: 25, width: 50, height: 50 },
                    })
                  }}
                >
                  По центру
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    updateOverlayLayer(currentScene.id, {
                      position: { x: 0, y: 0, width: 100, height: 50 },
                    })
                  }}
                >
                  Верх 50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    updateOverlayLayer(currentScene.id, {
                      position: { x: 0, y: 50, width: 100, height: 50 },
                    })
                  }}
                >
                  Низ 50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    updateOverlayLayer(currentScene.id, {
                      position: { x: 0, y: 0, width: 100, height: 33 },
                    })
                  }}
                >
                  Верх 33%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    updateOverlayLayer(currentScene.id, {
                      position: { x: 0, y: 67, width: 100, height: 33 },
                    })
                  }}
                >
                  Низ 33%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2 text-xs h-7"
                  onClick={() => {
                    const pos = overlayLayer.position ?? { x: 25, y: 25, width: 50, height: 50 }
                    updateOverlayLayer(currentScene.id, {
                      position: { ...pos, x: 0, width: 100 },
                    })
                  }}
                >
                  На всю ширину
                </Button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Диалог генерации Kie.ai */}
      <KieAiDialog
        open={showGenerationDialog}
        onOpenChange={setShowGenerationDialog}
        layerType={currentLayerType}
        sceneId={currentScene.id}
      />
    </div>
  )
}

// ============================================================================
// CHROMA KEY CONTROLS
// ============================================================================

interface ChromaKeyControlsProps {
  layer: any
  sceneId: string
  onUpdate: (updates: any) => void
  hasGreenScreen: boolean
}

function ChromaKeyControls({ layer, sceneId, onUpdate, hasGreenScreen }: ChromaKeyControlsProps) {
  const chromaKey: ChromaKeySettings = layer?.metadata?.chromaKey || DEFAULT_CHROMA_KEY_SETTINGS
  const isEnabled = !!chromaKey.enabled

  const updateChromaKey = (updates: Partial<ChromaKeySettings>) => {
    const newChromaKey = { ...chromaKey, ...updates }
    onUpdate({
      metadata: { ...(layer?.metadata || {}), chromaKey: newChromaKey },
    })
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {!isEnabled ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => updateChromaKey({ enabled: true })}
        >
          <Eraser className="h-4 w-4 text-green-500" />
          Удалить фон
        </Button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eraser className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Фон удалён</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => updateChromaKey({ enabled: false })}
            >
              Вернуть фон
            </Button>
          </div>

          {!hasGreenScreen && (
            <p className="text-xs text-amber-500">
              Видео сгенерировано без зелёного экрана. Перегенерируйте с включённым зелёным экраном для лучшего результата.
            </p>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Порог отсечения</Label>
                <span className="text-xs text-muted-foreground">{Math.round(chromaKey.similarity * 100)}%</span>
              </div>
              <Slider
                value={[chromaKey.similarity * 100]}
                min={10}
                max={80}
                step={1}
                onValueChange={([v]) => updateChromaKey({ similarity: v / 100 })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Мягкость краёв</Label>
                <span className="text-xs text-muted-foreground">{Math.round(chromaKey.smoothness * 100)}%</span>
              </div>
              <Slider
                value={[chromaKey.smoothness * 100]}
                min={0}
                max={50}
                step={1}
                onValueChange={([v]) => updateChromaKey({ smoothness: v / 100 })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
