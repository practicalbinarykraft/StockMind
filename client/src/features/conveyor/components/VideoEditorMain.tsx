/**
 * Главный компонент видео-редактора с новой системой слоев
 */

import { useParams } from 'wouter'
import { useEffect } from 'react'
import { useCompositionStore } from '../stores/composition'
import { RemotionPreview } from './video-editor/preview/RemotionPreview'
import { EditorToolbar } from './video-editor/toolbar/EditorToolbar'
import { VideoEditorHeader } from './video-editor/VideoEditorHeader'
import { ScenesList } from './video-editor/ScenesList'
import { Skeleton } from '@/shared/ui/skeleton'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { AlertCircle } from 'lucide-react'

export function VideoEditorMain() {
  const params = useParams<{ id: string }>()
  const scriptId = params.id!
  
  const loadScript = useCompositionStore((state) => state.loadScript)
  const isLoading = useCompositionStore((state) => state.isLoading)
  const error = useCompositionStore((state) => state.error)

  // Загрузка данных скрипта со слоями
  useEffect(() => {
    loadScript(scriptId)
  }, [scriptId, loadScript])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Ошибка загрузки данных: {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Хедер */}
      <div className="flex-shrink-0 mb-4">
        <VideoEditorHeader scriptId={scriptId} />
      </div>
      
      {/* Основной контент: Preview (слева) + Toolbar (справа) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 min-h-0 overflow-hidden">
        {/* Левая часть: Preview + Список сцен */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Remotion Preview */}
          <div className="flex-shrink-0">
            <RemotionPreview aspectRatio="16:9" />
          </div>
          
          {/* Список сцен */}
          <div className="flex-1 overflow-auto">
            <ScenesList />
          </div>
        </div>
        
        {/* Правая панель: Toolbar с вкладками */}
        <div className="overflow-auto">
          <EditorToolbar />
        </div>
      </div>
    </div>
  )
}
