/**
 * API функции для работы со слоями
 */

import { apiRequest } from '@/shared/api/http'
import type {
  SceneWithLayersResponse,
  ScriptWithLayersResponse,
  CreateLayerRequest,
  UpdateBackgroundLayerRequest,
  UpdateOverlayLayerRequest,
  UpdateTextLayerRequest,
  UpdateCompositionRequest,
  BackgroundLayer,
  OverlayLayer,
  TextLayer,
  SceneComposition,
  LayerType,
} from '../../types/layers'

/**
 * Получить все слои сцены
 * GET /api/scripts/:scriptId/scenes/:sceneId/layers
 */
export async function getSceneWithLayers(
  scriptId: string,
  sceneId: string
): Promise<SceneWithLayersResponse> {
  const response = await apiRequest(
    'GET',
    `/api/scripts/${scriptId}/scenes/${sceneId}/layers`
  )
  const result = await response.json()
  return result.data || result
}

/**
 * Получить все сцены скрипта со слоями
 * GET /api/scripts/:scriptId/layers
 */
export async function getScriptWithLayers(
  scriptId: string
): Promise<ScriptWithLayersResponse> {
  const response = await apiRequest('GET', `/api/scripts/${scriptId}/layers`)
  const result = await response.json()
  return result.data || result
}

/**
 * Создать новый слой для сцены
 * POST /api/scripts/:scriptId/scenes/:sceneId/layers
 */
export async function createLayer(
  scriptId: string,
  sceneId: string,
  data: CreateLayerRequest
): Promise<BackgroundLayer | OverlayLayer | TextLayer> {
  const response = await apiRequest(
    'POST',
    `/api/scripts/${scriptId}/scenes/${sceneId}/layers`,
    data
  )
  const result = await response.json()
  return result.data || result
}

/**
 * Обновить background слой
 * PATCH /api/scripts/:scriptId/layers/:layerId/background
 */
export async function updateBackgroundLayer(
  scriptId: string,
  layerId: string,
  data: UpdateBackgroundLayerRequest
): Promise<BackgroundLayer> {
  const response = await apiRequest(
    'PATCH',
    `/api/scripts/${scriptId}/layers/${layerId}`,
    data
  )
  const result = await response.json()
  return result.data || result
}

/**
 * Обновить overlay слой
 * PATCH /api/scripts/:scriptId/layers/:layerId/overlay
 */
export async function updateOverlayLayer(
  scriptId: string,
  layerId: string,
  data: UpdateOverlayLayerRequest
): Promise<OverlayLayer> {
  const response = await apiRequest(
    'PATCH',
    `/api/scripts/${scriptId}/layers/${layerId}`,
    data
  )
  const result = await response.json()
  return result.data || result
}

/**
 * Обновить text слой
 * PATCH /api/scripts/:scriptId/layers/:layerId/text
 */
export async function updateTextLayer(
  scriptId: string,
  layerId: string,
  data: UpdateTextLayerRequest
): Promise<TextLayer> {
  const response = await apiRequest(
    'PATCH',
    `/api/scripts/${scriptId}/layers/${layerId}`,
    data
  )
  const result = await response.json()
  return result.data || result
}

/**
 * Удалить слой
 * DELETE /api/scripts/:scriptId/layers/:layerId
 */
export async function deleteLayer(
  scriptId: string,
  layerId: string
): Promise<{ success: boolean }> {
  await apiRequest('DELETE', `/api/scripts/${scriptId}/layers/${layerId}`)
  return { success: true }
}

/**
 * Обновить композицию сцены
 * PATCH /api/scripts/:scriptId/scenes/:sceneId/composition
 */
export async function updateComposition(
  scriptId: string,
  sceneId: string,
  data: UpdateCompositionRequest
): Promise<SceneComposition> {
  const response = await apiRequest(
    'PATCH',
    `/api/scripts/${scriptId}/scenes/${sceneId}/composition`,
    data
  )
  const result = await response.json()
  return result.data || result
}

/**
 * Загрузить файл для слоя
 * POST /api/scripts/:scriptId/layers/:layerId/upload
 */
export async function uploadLayerFile(
  scriptId: string,
  layerId: string,
  file: File,
  layerType: LayerType
): Promise<{ sourceUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('layerType', layerType)

  const response = await fetch(
    `/api/scripts/${scriptId}/layers/${layerId}/upload`,
    {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }
  )

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  const result = await response.json()
  return result.data || result
}

/**
 * Создать дефолтные слои для сцены (background, overlay, textLayer)
 * POST /api/scripts/:scriptId/scenes/:sceneId/layers/default
 */
export async function createDefaultSceneLayers(
  scriptId: string,
  sceneId: string
): Promise<void> {
  await apiRequest(
    'POST',
    `/api/scripts/${scriptId}/scenes/${sceneId}/layers/default`
  )
}

/**
 * Разделить аудио на части по сценам
 * POST /api/scripts/:scriptId/audio/split
 */
export async function splitAudioByScenes(
  scriptId: string,
  audioUrl: string
): Promise<{ sceneAudioUrls: string[] }> {
  const response = await apiRequest(
    'POST',
    `/api/scripts/${scriptId}/audio/split`,
    { audioUrl }
  )
  const result = await response.json()
  return result.data || result
}

/**
 * Удалить аудио сцены
 * DELETE /api/scripts/:scriptId/scenes/:sceneId/audio
 */
export async function deleteSceneAudio(
  scriptId: string,
  sceneId: string
): Promise<{ success: boolean }> {
  await apiRequest('DELETE', `/api/scripts/${scriptId}/scenes/${sceneId}/audio`)
  return { success: true }
}
