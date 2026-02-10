/**
 * Страница выбора аватара и генерации видео
 * ≤300 строк
 */

import { useParams } from 'wouter'
import { useState, useEffect } from 'react'
import { AvatarPageHeader } from './video-editor/avatar/AvatarPageHeader'
import { AvatarSearch } from './video-editor/avatar/AvatarSearch'
import { AvatarGrid } from './video-editor/avatar/AvatarGrid'
import { VideoFormatSelector } from './video-editor/avatar/VideoFormatSelector'
import { VideoGenerationSection } from './video-editor/avatar/VideoGenerationSection'
import { AvatarPageFooter } from './video-editor/avatar/AvatarPageFooter'
import { useVideoEditorData } from '@/features/conveyor/hooks/use-video-editor-data'
import { useAvatarSelection } from '@/features/conveyor/hooks/use-avatar-selection'
import { useVideoGeneration } from '@/features/conveyor/hooks/use-video-generation'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'
import { apiRequest } from '@/shared/api/http'

export function VideoEditorAvatar() {
  const params = useParams<{ id: string }>()
  const scriptId = params.id!

  const { script, isLoading: isScriptLoading } = useVideoEditorData(scriptId)

  const {
    myAvatars,
    publicAvatars,
    selectedAvatarId,
    isLoading: isAvatarsLoading,
    error: avatarsError,
    searchQuery,
    setSearchQuery,
    setSelectedAvatarId,
    refreshAvatars,
  } = useAvatarSelection(scriptId)

  const {
    isGenerating,
    videoStatus,
    videoProgress,
    videoUrl,
    errorMessage,
    generate,
  } = useVideoGeneration(scriptId)

  const [hasAudio, setHasAudio] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [videoDimension, setVideoDimension] = useState({ width: 1280, height: 720 })
  const [userPlan, setUserPlan] = useState<'free' | 'paid'>('free')
  const [planLoaded, setPlanLoaded] = useState(false)

  // Проверка наличия аудио и загрузка плана пользователя
  useEffect(() => {
    let isMounted = true

    const checkAudioAndPlan = async () => {
      try {
        // Параллельная загрузка медиа и квоты
        const [media, quotaResponse] = await Promise.all([
          scriptMediaService.getMedia(scriptId),
          apiRequest('GET', '/api/heygen/quota').catch(() => null),
        ])

        if (isMounted) {
          setHasAudio(!!media?.audioUrl)
          setAudioUrl(media?.audioUrl || null)
          let detectedPlan: 'free' | 'paid' = 'free'
          if (quotaResponse) {
            try {
              const quotaData = await quotaResponse.json()
              const isFreePlan = quotaData.data?.isFreePlan ?? true
              detectedPlan = isFreePlan ? 'free' : 'paid'
              setUserPlan(detectedPlan)
              console.log('📊 HeyGen план:', isFreePlan ? 'FREE' : 'PAID')
            } catch (err) {
              console.error('Failed to parse quota:', err)
              setUserPlan('free')
            }
          } else {
            setUserPlan('free')
          }
          setPlanLoaded(true)

          if (media?.videoAspectRatio && media?.videoDimension) {
            // Уже есть сохранённый формат - используем его
            setSelectedFormat(media.videoAspectRatio)
            setVideoDimension(media.videoDimension)
            console.log('✅ Загружен сохранённый формат:', media.videoAspectRatio, media.videoDimension)
          } else if (media?.videoUrl && !media?.videoAspectRatio) {
            // Старое видео без сохранённого формата - используем старый дефолт
            setSelectedFormat('16:9')
            setVideoDimension({ width: 1280, height: 720 })
            console.log('📼 Старое видео - используем дефолт 16:9 (1280×720)')
          } else {
            // Новое видео - устанавливаем дефолт в зависимости от плана
            if (detectedPlan === 'paid') {
              setSelectedFormat('16:9')
              setVideoDimension({ width: 1920, height: 1080 })
              console.log('🆕 Новое видео (PAID план) - дефолт 16:9 (1920×1080)')
            } else {
              setSelectedFormat('16:9')
              setVideoDimension({ width: 1280, height: 720 })
              console.log('🆕 Новое видео (FREE план) - дефолт 16:9 (1280×720)')
            }
          }
          // Для нового видео дефолты уже установлены выше
        }
      } catch (err) {
        console.error('Failed to check audio and plan:', err)
        if (isMounted) {
          setUserPlan('free')
          setPlanLoaded(true)
        }
      }
    }

    checkAudioAndPlan()

    return () => {
      isMounted = false
    }
  }, [scriptId])

  // Обработчик выбора аватара
  const handleAvatarSelect = async (avatarId: string) => {
    setSelectedAvatarId(avatarId)

    // Сохранение выбора в БД
    try {
      await scriptMediaService.updateVideo(scriptId, {
        selectedAvatar: avatarId,
      })
    } catch (err) {
      console.error('Failed to save avatar selection:', err)
    }
  }

  // Обработчик изменения формата видео
  const handleFormatChange = async (
    format: '16:9' | '9:16' | '1:1',
    dimension: { width: number; height: number }
  ) => {
    setSelectedFormat(format)
    setVideoDimension(dimension)

    // Сохранение в БД
    try {
      await scriptMediaService.updateVideo(scriptId, {
        videoAspectRatio: format,
        videoDimension: dimension,
      })
    } catch (err) {
      console.error('Failed to save format:', err)
    }
  }

  // Обработчик генерации
  const handleGenerate = async () => {
    if (!selectedAvatarId || !audioUrl) return

    await generate(selectedAvatarId, audioUrl, videoDimension)
  }

  if (isScriptLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      <AvatarPageHeader scriptId={scriptId} scriptTitle={script?.title} />

      {/* Ошибка загрузки аватаров */}
      {avatarsError && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {avatarsError}
        </div>
      )}

      {/* Поиск */}
      <AvatarSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={refreshAvatars}
        isRefreshing={isAvatarsLoading}
      />

      {/* Сетка аватаров */}
      <AvatarGrid
        myAvatars={myAvatars}
        publicAvatars={publicAvatars}
        selectedAvatarId={selectedAvatarId}
        onAvatarSelect={handleAvatarSelect}
        isLoading={isAvatarsLoading}
      />

      {/* Выбор формата видео */}
      <VideoFormatSelector
        selectedFormat={selectedFormat}
        onFormatChange={handleFormatChange}
        disabled={isGenerating}
        userPlan={userPlan}
      />

      {/* Генерация видео */}
      <VideoGenerationSection
        selectedAvatarId={selectedAvatarId}
        hasAudio={hasAudio}
        isGenerating={isGenerating}
        videoStatus={videoStatus}
        videoProgress={videoProgress}
        videoUrl={videoUrl}
        errorMessage={errorMessage || undefined}
        onGenerate={handleGenerate}
      />

      {/* Футер */}
      <AvatarPageFooter
        scriptId={scriptId}
        hasVideo={videoStatus === 'completed' && !!videoUrl}
      />
    </div>
  )
}
