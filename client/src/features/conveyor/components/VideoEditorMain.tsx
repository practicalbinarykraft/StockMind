/**
 * Главный компонент видео-редактора
 */

import { useParams } from 'wouter'
import { useEffect } from 'react'
import { useVideoEditorData } from '../hooks/use-video-editor-data'
import { useVideoFormatStore } from '../stores/useVideoFormatStore'
import { VideoEditorHeader } from './video-editor/VideoEditorHeader'
import { VideoEditorPreview } from './video-editor/VideoEditorPreview'
import { VideoEditorSidebar } from './video-editor/VideoEditorSidebar'
import { Skeleton } from '@/shared/ui/skeleton'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { AlertCircle } from 'lucide-react'

export function VideoEditorMain() {
  const params = useParams<{ id: string }>()
  const scriptId = params.id!
  
  const {
    script,
    media,
    status,
    isLoading,
    hasError,
  } = useVideoEditorData(scriptId)

  // Используем Zustand store для формата видео
  const { selectedFormat, initialize, setFormat } = useVideoFormatStore()

  // Инициализация store при монтировании
  useEffect(() => {
    initialize(scriptId)
  }, [scriptId, initialize])

  // Обработчик изменения формата
  const handleFormatChange = async (format: '16:9' | '9:16' | '1:1') => {
    await setFormat(format)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (hasError || !script) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Ошибка загрузки данных сценария
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col lg:h-[calc(100vh-8.5rem)]">
      <div className="flex-shrink-0 mb-4 sm:mb-6">
        <VideoEditorHeader 
          script={script} 
          status={status}
        />
      </div>
      
      {/* Адаптивная сетка с вертикальной прокруткой на мобильных */}
      <div className="flex flex-col lg:flex-1 lg:grid lg:grid-cols-[minmax(500px,800px)_1fr] gap-4 sm:gap-6 lg:min-h-0 lg:overflow-hidden">
        {/* Превью видео */}
        <div className="w-full h-[50vh] lg:h-full flex-shrink-0">
          <VideoEditorPreview 
            media={media} 
            status={status}
            selectedFormat={selectedFormat}
            onFormatChange={handleFormatChange}
          />
        </div>
        
        {/* Сцены - увеличенная минимальная высота на мобильных */}
        <div className="w-full min-h-[70vh] lg:min-h-0 lg:h-full pb-6 lg:pb-0">
          <VideoEditorSidebar script={script} status={status} />
        </div>
      </div>
    </div>
  )
}
