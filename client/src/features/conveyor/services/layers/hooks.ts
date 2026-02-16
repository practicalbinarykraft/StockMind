/**
 * React Query хуки для работы со слоями
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateLayerRequest,
  UpdateBackgroundLayerRequest,
  UpdateOverlayLayerRequest,
  UpdateTextLayerRequest,
  UpdateCompositionRequest,
  LayerType,
} from '../../types/layers'
import * as api from './api'

// Query Keys
export const layersKeys = {
  all: ['layers'] as const,
  scripts: () => [...layersKeys.all, 'scripts'] as const,
  script: (scriptId: string) => [...layersKeys.scripts(), scriptId] as const,
  scenes: () => [...layersKeys.all, 'scenes'] as const,
  scene: (scriptId: string, sceneId: string) =>
    [...layersKeys.scenes(), scriptId, sceneId] as const,
}

/**
 * Загрузка сцены со слоями
 */
export function useSceneWithLayers(scriptId: string, sceneId: string) {
  return useQuery({
    queryKey: layersKeys.scene(scriptId, sceneId),
    queryFn: () => api.getSceneWithLayers(scriptId, sceneId),
    enabled: !!scriptId && !!sceneId,
    staleTime: 5000,
  })
}

/**
 * Загрузка скрипта со всеми сценами и слоями
 */
export function useScriptWithLayers(scriptId: string) {
  return useQuery({
    queryKey: layersKeys.script(scriptId),
    queryFn: () => api.getScriptWithLayers(scriptId),
    enabled: !!scriptId,
    staleTime: 5000,
  })
}

/**
 * Создание слоя
 */
export function useCreateLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scriptId,
      sceneId,
      data,
    }: {
      scriptId: string
      sceneId: string
      data: CreateLayerRequest
    }) => api.createLayer(scriptId, sceneId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.scene(variables.scriptId, variables.sceneId),
      })
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}

/**
 * Обновление background слоя
 */
export function useUpdateBackgroundLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scriptId,
      layerId,
      data,
    }: {
      scriptId: string
      layerId: string
      data: UpdateBackgroundLayerRequest
    }) => api.updateBackgroundLayer(scriptId, layerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}

/**
 * Обновление overlay слоя
 */
export function useUpdateOverlayLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scriptId,
      layerId,
      data,
    }: {
      scriptId: string
      layerId: string
      data: UpdateOverlayLayerRequest
    }) => api.updateOverlayLayer(scriptId, layerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}

/**
 * Обновление text слоя
 */
export function useUpdateTextLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scriptId,
      layerId,
      data,
    }: {
      scriptId: string
      layerId: string
      data: UpdateTextLayerRequest
    }) => api.updateTextLayer(scriptId, layerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}

/**
 * Удаление слоя
 */
export function useDeleteLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scriptId,
      layerId,
    }: {
      scriptId: string
      layerId: string
    }) => api.deleteLayer(scriptId, layerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}

/**
 * Обновление композиции
 */
export function useUpdateComposition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scriptId,
      sceneId,
      data,
    }: {
      scriptId: string
      sceneId: string
      data: UpdateCompositionRequest
    }) => api.updateComposition(scriptId, sceneId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.scene(variables.scriptId, variables.sceneId),
      })
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}

/**
 * Загрузка файла
 */
export function useUploadLayerFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scriptId,
      layerId,
      file,
      layerType,
    }: {
      scriptId: string
      layerId: string
      file: File
      layerType: LayerType
    }) => api.uploadLayerFile(scriptId, layerId, file, layerType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}

/**
 * Разделить аудио на сцены
 */
export function useSplitAudioByScenes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ scriptId, audioUrl }: { scriptId: string; audioUrl: string }) =>
      api.splitAudioByScenes(scriptId, audioUrl),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}

/**
 * Удалить аудио сцены
 */
export function useDeleteSceneAudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ scriptId, sceneId }: { scriptId: string; sceneId: string }) =>
      api.deleteSceneAudio(scriptId, sceneId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: layersKeys.script(variables.scriptId),
      })
    },
  })
}
