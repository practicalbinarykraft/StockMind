/**
 * Optimistic updates и вспомогательные функции
 */

import { useQueryClient } from '@tanstack/react-query'
import type { SceneWithLayersResponse, OverlayLayer, UpdateOverlayLayerRequest } from '../../types/layers'
import { layersKeys } from './hooks'

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
