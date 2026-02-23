/**
 * Утилиты для работы со слоями: трансформация данных, optimistic updates
 */

import { useQueryClient } from '@tanstack/react-query'
import type { SceneWithLayersResponse, OverlayLayer, UpdateOverlayLayerRequest } from '../../types/layers'
import { layersKeys } from './hooks'

/**
 * Сливает вложенную структуру слоя { base, background?, overlay?, text? }
 * от backend в плоский объект, совместимый с фронтенд-типами.
 * Если формат уже плоский (есть layerType на верхнем уровне) — возвращает as-is.
 */
export function flattenLayer(rawLayer: any): any {
  if (rawLayer.layerType) return rawLayer

  const base = rawLayer.base
  if (!base) return rawLayer

  const ext = rawLayer.background || rawLayer.overlay || rawLayer.text || {}
  return { ...ext, ...base }
}

/**
 * Optimistic update позиции overlay для плавного drag & drop
 */
export function useOptimisticOverlayPosition() {
  const queryClient = useQueryClient()

  return {
    updatePosition: (
      scriptId: string,
      sceneId: string,
      layerId: string,
      position: UpdateOverlayLayerRequest['position']
    ) => {
      queryClient.setQueryData(
        layersKeys.scene(scriptId, sceneId),
        (old: SceneWithLayersResponse | undefined) => {
          if (!old) return old

          return {
            ...old,
            layers: old.layers.map((layer) => {
              if (layer.id === layerId && layer.layerType === 'overlay') {
                return {
                  ...layer,
                  position,
                } as OverlayLayer
              }
              return layer
            }),
          }
        }
      )
    },
  }
}
