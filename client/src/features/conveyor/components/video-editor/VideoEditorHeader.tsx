/**
 * Заголовок видео-редактора с интеграцией нового store
 */

import { useLocation } from 'wouter'
import { useState } from 'react'
import { ArrowLeft, Edit, Save, Undo, Redo, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCompositionStore, selectHasChanges, selectSortedScenes } from '../../stores/composition'
import { useToast } from '@/shared/hooks/use-toast'
import { 
  useUpdateBackgroundLayer, 
  useUpdateOverlayLayer, 
  useUpdateTextLayer,
  useUpdateComposition 
} from '../../services/layers/hooks'

interface VideoEditorHeaderProps {
  scriptId: string
}

export function VideoEditorHeader({ scriptId }: VideoEditorHeaderProps) {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  
  const scenes = useCompositionStore(selectSortedScenes)
  const canUndo = useCompositionStore((state) => state.canUndo())
  const canRedo = useCompositionStore((state) => state.canRedo())
  const hasChanges = useCompositionStore(selectHasChanges)
  const undo = useCompositionStore((state) => state.undo)
  const redo = useCompositionStore((state) => state.redo)

  const updateBackgroundMutation = useUpdateBackgroundLayer()
  const updateOverlayMutation = useUpdateOverlayLayer()
  const updateTextMutation = useUpdateTextLayer()
  const updateCompositionMutation = useUpdateComposition()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Сохраняем изменения для всех сцен
      const savePromises: Promise<any>[] = []

      for (const scene of scenes) {
        // Сохраняем background layer
        if (scene.layers.background) {
          savePromises.push(
            updateBackgroundMutation.mutateAsync({
              scriptId,
              layerId: scene.layers.background.id,
              data: {
                contentType: scene.layers.background.contentType,
                sourceUrl: scene.layers.background.sourceUrl,
                generationPrompt: scene.layers.background.generationPrompt,
                generationModel: scene.layers.background.generationModel,
                dimensions: scene.layers.background.dimensions,
              },
            })
          )
        }

        // Сохраняем overlay layer
        if (scene.layers.overlay) {
          savePromises.push(
            updateOverlayMutation.mutateAsync({
              scriptId,
              layerId: scene.layers.overlay.id,
              data: {
                contentType: scene.layers.overlay.contentType,
                sourceUrl: scene.layers.overlay.sourceUrl,
                position: scene.layers.overlay.position,
                aspectLock: scene.layers.overlay.aspectLock,
                minSize: scene.layers.overlay.minSize,
                maxSize: scene.layers.overlay.maxSize,
              },
            })
          )
        }

        // Сохраняем text layer
        if (scene.layers.textLayer) {
          savePromises.push(
            updateTextMutation.mutateAsync({
              scriptId,
              layerId: scene.layers.textLayer.id,
              data: {
                text: scene.layers.textLayer.text,
                mode: scene.layers.textLayer.mode,
                position: scene.layers.textLayer.position,
                fontSize: scene.layers.textLayer.fontSize,
                fontFamily: scene.layers.textLayer.fontFamily,
                textColor: scene.layers.textLayer.textColor,
                textAlign: scene.layers.textLayer.textAlign,
                backgroundColor: scene.layers.textLayer.backgroundColor,
                backgroundOpacity: scene.layers.textLayer.backgroundOpacity,
                marqueeSpeed: scene.layers.textLayer.marqueeSpeed,
                isVisible: scene.layers.textLayer.isVisible,
              },
            })
          )
        }

        // Сохраняем композицию
        if (scene.composition) {
          savePromises.push(
            updateCompositionMutation.mutateAsync({
              scriptId,
              sceneId: scene.id,
              data: {
                mode: scene.composition.mode,
                splitRatio: scene.composition.splitRatio,
                splitDirection: scene.composition.splitDirection,
                splitOrder: scene.composition.splitOrder,
                gridSnapping: scene.composition.gridSnapping,
                gridSize: scene.composition.gridSize,
              },
            })
          )
        }
      }

      // Ждём завершения всех запросов
      await Promise.all(savePromises)
      
      toast({
        title: 'Изменения сохранены',
        description: `Сохранено ${scenes.length} сцен с их слоями и композицией`,
      })
    } catch (error) {
      toast({
        title: 'Ошибка сохранения',
        description: error instanceof Error ? error.message : 'Не удалось сохранить изменения',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/conveyor/scripts')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Видео-редактор</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Редактирование композиции сцен
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className="text-xs sm:text-sm"
        >
          <Undo className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Отменить</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          className="text-xs sm:text-sm"
        >
          <Redo className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Вернуть</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/conveyor/editor/${scriptId}`)}
          className="text-xs sm:text-sm"
        >
          <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Редактор текста</span>
          <span className="sm:hidden">Текст</span>
        </Button>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="text-xs sm:text-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
              <span className="hidden sm:inline">Сохранение...</span>
            </>
          ) : (
            <>
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Сохранить</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
