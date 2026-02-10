/**
 * Главный компонент видео-редактора
 */

import { useParams } from 'wouter'
import { useState, useEffect } from 'react'
import { useVideoEditorData } from '../hooks/use-video-editor-data'
import { VideoEditorHeader } from './video-editor/VideoEditorHeader'
import { VideoEditorPreview } from './video-editor/VideoEditorPreview'
import { VideoEditorSidebar } from './video-editor/VideoEditorSidebar'
import { scriptMediaService } from '../services/scriptMediaService'
import { apiRequest } from '@/shared/api/http'
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

  const [selectedFormat, setSelectedFormat] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [userPlan, setUserPlan] = useState<'free' | 'paid'>('free')

  // Загрузка формата и плана
  useEffect(() => {
    const loadFormatAndPlan = async () => {
      try {
        // Загрузка сохранённого формата
        const mediaData = await scriptMediaService.getMedia(scriptId)
        if (mediaData?.videoAspectRatio) {
          setSelectedFormat(mediaData.videoAspectRatio)
        }

        // Загрузка плана пользователя
        const quotaResponse = await apiRequest('GET', '/api/heygen/quota').catch(() => null)
        if (quotaResponse) {
          const quotaData = await quotaResponse.json()
          const isFreePlan = quotaData.data?.isFreePlan ?? true
          setUserPlan(isFreePlan ? 'free' : 'paid')
        }
      } catch (err) {
        console.error('Failed to load format and plan:', err)
      }
    }

    loadFormatAndPlan()
  }, [scriptId])

  // Обработчик изменения формата
  const handleFormatChange = async (format: '16:9' | '9:16' | '1:1') => {
    setSelectedFormat(format)

    // Определяем dimension в зависимости от плана
    let dimension: { width: number; height: number }
    if (userPlan === 'paid') {
      // HD разрешения для paid плана
      switch (format) {
        case '16:9':
          dimension = { width: 1920, height: 1080 }
          break
        case '9:16':
          dimension = { width: 1080, height: 1920 }
          break
        case '1:1':
          dimension = { width: 1080, height: 1080 }
          break
      }
    } else {
      // 720p разрешения для free плана
      switch (format) {
        case '16:9':
          dimension = { width: 1280, height: 720 }
          break
        case '9:16':
          dimension = { width: 720, height: 1280 }
          break
        case '1:1':
          dimension = { width: 720, height: 720 }
          break
      }
    }

    // Сохранение в БД
    try {
      await scriptMediaService.updateVideo(scriptId, {
        videoAspectRatio: format,
        videoDimension: dimension,
      })
      console.log(`✅ Сохранён формат: ${format} (${dimension.width}×${dimension.height})`)
    } catch (err) {
      console.error('Failed to save format:', err)
    }
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
    <div className="flex flex-col h-[calc(100vh-8.5rem)]">
      <div className="flex-shrink-0 mb-4 sm:mb-6">
        <VideoEditorHeader 
          script={script} 
          status={status}
        />
      </div>
      
      {/* Адаптивная сетка с равномерным распределением места */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(500px,800px)_1fr] gap-4 sm:gap-6 min-h-0 overflow-hidden">
        {/* Превью видео */}
        <div className="min-h-0 w-full flex-shrink-0 h-[45vh] lg:h-full">
          <VideoEditorPreview 
            media={media} 
            status={status}
            selectedFormat={selectedFormat}
            onFormatChange={handleFormatChange}
            userPlan={userPlan}
          />
        </div>
        
        {/* Сцены - занимают оставшееся место */}
        <div className="min-h-0 w-full flex-1 lg:flex-initial overflow-hidden">
          <VideoEditorSidebar script={script} status={status} />
        </div>
      </div>
    </div>
  )
}
