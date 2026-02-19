/**
 * Вкладка для настройки визуалов (background и overlay)
 * Поддерживает генерацию контента через Kie.ai, HeyGen (аватар) и загрузку файлов
 */

import { useState } from 'react'
import { useLocation } from 'wouter'
import { useCompositionStore, selectCurrentScene } from '../../../stores/composition'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Separator } from '@/shared/ui/separator'
import { Badge } from '@/shared/ui/badge'
import { Upload, Sparkles, Image as ImageIcon, Video as VideoIcon, User, ExternalLink, CheckCircle, Move } from 'lucide-react'
import { Slider } from '@/shared/ui/slider'
import { KieAiDialog } from '../generation/KieAiDialog'
import { GenerationStatusCard } from '../generation/GenerationStatusCard'
import { useToast } from '@/shared/hooks/use-toast'
import type { ContentType } from '../../../types/layers'
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

  const bgContentType = backgroundLayer?.contentType || 'image'
  const olContentType = overlayLayer?.contentType || 'image'

  return (
    <div className="space-y-6">
      {/* Информация об аватаре (HeyGen) */}
      {media?.videoUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold leading-tight">
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
        <div>
          <h3 className="text-lg font-semibold mb-2">Фоновый слой</h3>
          <p className="text-sm text-muted-foreground">
            Основной визуальный контент сцены
          </p>
        </div>

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

        {/* Кнопки действий — переключаются в зависимости от типа контента */}
        {bgContentType === 'avatar' ? (
          <Button
            variant="default"
            className="w-full"
            onClick={handleNavigateToAvatar}
          >
            <User className="h-4 w-4 mr-2" />
            Выбрать аватар (HeyGen)
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        ) : (
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
        )}

        {/* Статус генерации для background */}
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

        {/* Превью background */}
        {backgroundLayer?.sourceUrl && !backgroundLayer.generationStatus && (
          <div className="aspect-video rounded-md overflow-hidden border">
            {backgroundLayer.contentType === 'video' || backgroundLayer.contentType === 'avatar' ? (
              <video src={backgroundLayer.sourceUrl} className="w-full h-full object-cover" controls />
            ) : (
              <img src={backgroundLayer.sourceUrl} alt="Background" className="w-full h-full object-cover" />
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Overlay Layer */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Overlay слой</h3>
          <p className="text-sm text-muted-foreground">
            Дополнительный контент поверх фона
          </p>
        </div>

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

        {/* Кнопки действий — переключаются в зависимости от типа контента */}
        {olContentType === 'avatar' ? (
          <Button
            variant="default"
            className="w-full"
            onClick={handleNavigateToAvatar}
          >
            <User className="h-4 w-4 mr-2" />
            Выбрать аватар (HeyGen)
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        ) : (
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
        )}

        {/* Статус генерации для overlay */}
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

        {/* Превью overlay */}
        {overlayLayer?.sourceUrl && !overlayLayer.generationStatus && (
          <div className="aspect-video rounded-md overflow-hidden border">
            {overlayLayer.contentType === 'video' || overlayLayer.contentType === 'avatar' ? (
              <video src={overlayLayer.sourceUrl} className="w-full h-full object-cover" controls />
            ) : (
              <img src={overlayLayer.sourceUrl} alt="Overlay" className="w-full h-full object-cover" />
            )}
          </div>
        )}

        {/* Позиция и размер overlay */}
        {overlayLayer && (
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  updateOverlayLayer(currentScene.id, {
                    position: { x: 0, y: 0, width: 100, height: 100 },
                  })
                }}
              >
                На весь экран
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  updateOverlayLayer(currentScene.id, {
                    position: { x: 25, y: 25, width: 50, height: 50 },
                  })
                }}
              >
                По центру
              </Button>
            </div>
          </div>
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
