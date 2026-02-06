/**
 * Страница выбора аватара и генерации видео
 * ≤300 строк
 */

import { useParams } from 'wouter'
import { useState, useEffect } from 'react'
import { AvatarPageHeader } from './video-editor/avatar/AvatarPageHeader'
import { AvatarSearch } from './video-editor/avatar/AvatarSearch'
import { AvatarGrid } from './video-editor/avatar/AvatarGrid'
import { VideoGenerationSection } from './video-editor/avatar/VideoGenerationSection'
import { AvatarPageFooter } from './video-editor/avatar/AvatarPageFooter'
import { useVideoEditorData } from '@/features/conveyor/hooks/use-video-editor-data'
import { useAvatarSelection } from '@/features/conveyor/hooks/use-avatar-selection'
import { useVideoGeneration } from '@/features/conveyor/hooks/use-video-generation'
import { scriptMediaService } from '@/features/conveyor/services/scriptMediaService'

export function VideoEditorAvatar() {
  const params = useParams<{ id: string }>()
  const scriptId = params.id!

  const { script, isLoading: isScriptLoading } = useVideoEditorData(scriptId)

  const {
    avatars,
    selectedAvatarId,
    isLoading: isAvatarsLoading,
    error: avatarsError,
    searchQuery,
    currentPage,
    totalPages,
    setSearchQuery,
    setSelectedAvatarId,
    setCurrentPage,
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

  // Проверка наличия аудио (выполняется только один раз при монтировании)
  useEffect(() => {
    let isMounted = true

    const checkAudio = async () => {
      try {
        const media = await scriptMediaService.getMedia(scriptId)
        if (isMounted) {
          setHasAudio(!!media?.audioUrl)
          setAudioUrl(media?.audioUrl || null)
        }
      } catch (err) {
        console.error('Failed to check audio:', err)
      }
    }

    checkAudio()

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

  // Обработчик генерации
  const handleGenerate = async () => {
    if (!selectedAvatarId || !audioUrl) return

    await generate(selectedAvatarId, audioUrl)
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
        avatars={avatars}
        selectedAvatarId={selectedAvatarId}
        onAvatarSelect={handleAvatarSelect}
        isLoading={isAvatarsLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
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
