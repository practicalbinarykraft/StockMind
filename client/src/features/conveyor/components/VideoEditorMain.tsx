/**
 * Главный компонент видео-редактора
 */

import { useParams } from 'wouter'
import { useVideoEditorData } from '../hooks/use-video-editor-data'
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
    <div className="flex flex-col h-[calc(100vh-8.5rem)]">
      <div className="flex-shrink-0 mb-6">
        <VideoEditorHeader script={script} status={status} />
      </div>
      
      <div className="flex-1 grid grid-cols-[600px_1fr] gap-6 min-h-0">
        <div className="min-h-0 flex">
          <VideoEditorPreview media={media} status={status} />
        </div>
        
        <div className="min-h-0 flex">
          <VideoEditorSidebar script={script} status={status} />
        </div>
      </div>
    </div>
  )
}
