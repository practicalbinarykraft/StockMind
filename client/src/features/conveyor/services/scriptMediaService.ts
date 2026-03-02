/**
 * Сервис для работы с медиа сценариев (аудио/видео)
 */

import { apiRequest } from '@/shared/api/http'

// Типы для ScriptMedia
export interface ScriptMedia {
  id: string
  scriptId: string
  
  // Аудио
  audioUrl?: string
  audioMode?: 'generate' | 'upload' | 'record'
  selectedVoice?: string
  audioFilename?: string
  audioFilesize?: number
  audioGeneratedAt?: string
  
  // Видео
  videoUrl?: string
  videoId?: string
  selectedAvatar?: string
  videoDuration?: number
  videoStatus?: 'generating' | 'completed' | 'failed'
  videoThumbnailUrl?: string
  videoGeneratedAt?: string
  videoErrorMessage?: string
  videoDimension?: {
    width: number
    height: number
  }
  videoAspectRatio?: '16:9' | '9:16' | '1:1'
  
  // Настройки фона аватара
  compositionSettings?: {
    greenScreen?: boolean
    webmTransparent?: boolean
    [key: string]: any
  }
  
  createdAt: string
  updatedAt: string
}

export interface ScriptMediaStatus {
  hasAudio: boolean
  hasVideo: boolean
  videoStatus: string | null
  audioMode: string | null
  videoGeneratedAt: string | null
  audioGeneratedAt: string | null
}

/**
 * Получить медиа для скрипта
 * Эндпоинт: GET /api/scripts/:scriptId/media
 */
export async function getMedia(scriptId: string): Promise<ScriptMedia | null> {
  const response = await apiRequest('GET', `/api/scripts/${scriptId}/media`)
  const result = await response.json()
  return result.data || result
}

/**
 * Upsert медиа (создать или обновить)
 * Эндпоинт: PUT /api/scripts/:scriptId/media
 */
export async function upsertMedia(
  scriptId: string,
  data: Partial<ScriptMedia>
): Promise<ScriptMedia> {
  const response = await apiRequest('PUT', `/api/scripts/${scriptId}/media`, data)
  const result = await response.json()
  return result.data || result
}

/**
 * Обновить только аудио
 * Эндпоинт: PATCH /api/scripts/:scriptId/media/audio
 */
export async function updateAudio(
  scriptId: string,
  data: {
    audioUrl?: string
    audioMode?: 'generate' | 'upload' | 'record'
    selectedVoice?: string
    audioFilename?: string
    audioFilesize?: number
    audioGeneratedAt?: string
  }
): Promise<ScriptMedia> {
  const response = await apiRequest('PATCH', `/api/scripts/${scriptId}/media/audio`, data)
  const result = await response.json()
  return result.data || result
}

/**
 * Обновить только видео
 * Эндпоинт: PATCH /api/scripts/:scriptId/media/video
 */
export async function updateVideo(
  scriptId: string,
  data: {
    videoUrl?: string
    videoId?: string
    selectedAvatar?: string
    videoDuration?: number
    videoStatus?: 'generating' | 'completed' | 'failed'
    videoThumbnailUrl?: string
    videoGeneratedAt?: string
    videoErrorMessage?: string
    videoDimension?: {
      width: number
      height: number
    }
    videoAspectRatio?: '16:9' | '9:16' | '1:1'
  }
): Promise<ScriptMedia> {
  const response = await apiRequest('PATCH', `/api/scripts/${scriptId}/media/video`, data)
  const result = await response.json()
  return result.data || result
}

/**
 * Получить статус медиа
 * Эндпоинт: GET /api/scripts/:scriptId/media/status
 */
export async function getMediaStatus(scriptId: string): Promise<ScriptMediaStatus> {
  const response = await apiRequest('GET', `/api/scripts/${scriptId}/media/status`)
  const result = await response.json()
  return result.data || result
}

/**
 * Удалить медиа
 * Эндпоинт: DELETE /api/scripts/:scriptId/media
 */
export async function deleteMedia(scriptId: string): Promise<{ success: boolean }> {
  await apiRequest('DELETE', `/api/scripts/${scriptId}/media`)
  return { success: true }
}

export const scriptMediaService = {
  getMedia,
  upsertMedia,
  updateAudio,
  updateVideo,
  getMediaStatus,
  deleteMedia,
}
