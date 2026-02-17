/**
 * Вкладка для настройки визуалов (background и overlay)
 * Поддерживает генерацию контента через Kie.ai и загрузку файлов
 */

import { useState } from 'react'
import { useCompositionStore, selectCurrentScene } from '../../../stores/composition'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Separator } from '@/shared/ui/separator'
import { Upload, Sparkles, Image as ImageIcon, Video as VideoIcon, User } from 'lucide-react'
import { KieAiDialog } from '../generation/KieAiDialog'
import { GenerationStatusCard } from '../generation/GenerationStatusCard'
import { useToast } from '@/shared/hooks/use-toast'
import type { ContentType } from '../../../types/layers'

export function VisualsTab() {
  const currentScene = useCompositionStore(selectCurrentScene)
  const updateBackgroundLayer = useCompositionStore((state) => state.updateBackgroundLayer)
  const updateOverlayLayer = useCompositionStore((state) => state.updateOverlayLayer)
  const uploadFile = useCompositionStore((state) => state.uploadFile)
  const { toast } = useToast()

  const [showGenerationDialog, setShowGenerationDialog] = useState(false)
  const [currentLayerType, setCurrentLayerType] = useState<'background' | 'overlay'>('background')

  const backgroundLayer = currentScene?.layers.background
  const overlayLayer = currentScene?.layers.overlay

  if (!currentScene) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Выберите сцену для настройки визуалов
      </div>
    )
  }

  const handleContentTypeChange = (layerType: 'background' | 'overlay', contentType: ContentType) => {
    if (layerType === 'background') {
      updateBackgroundLayer(currentScene.id, { contentType })
    } else if (layerType === 'overlay') {
      updateOverlayLayer(currentScene.id, { contentType })
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

  return (
    <div className="space-y-6">
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
            value={backgroundLayer?.contentType || 'image'}
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

        {/* Статус генерации для background */}
        {backgroundLayer?.generationStatus && (
          <GenerationStatusCard
            status={backgroundLayer.generationStatus}
            jobId={backgroundLayer.generationJobId}
            resultUrl={backgroundLayer.sourceUrl}
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
            value={overlayLayer?.contentType || 'image'}
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

        {/* Статус генерации для overlay */}
        {overlayLayer?.generationStatus && (
          <GenerationStatusCard
            status={overlayLayer.generationStatus}
            jobId={overlayLayer.generationJobId}
            resultUrl={overlayLayer.sourceUrl}
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
      </div>

      {/* Диалог генерации */}
      <KieAiDialog
        open={showGenerationDialog}
        onOpenChange={setShowGenerationDialog}
        layerType={currentLayerType}
        sceneId={currentScene.id}
      />
    </div>
  )
}
