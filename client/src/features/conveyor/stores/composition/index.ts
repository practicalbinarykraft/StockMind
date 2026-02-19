/**
 * Главный composition store - объединяет все части
 */

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { initialState, type CompositionStore } from './types'
import { createSceneActions, createLayerActions } from './actions'
import { createSyncActions } from './sync'
import type { EnhancedScene } from '../../types/layers'

export const useCompositionStore = create<CompositionStore>()((...args) => ({
  ...initialState,
  ...createSceneActions(...args),
  ...createLayerActions(...args),
  ...createSyncActions(...args),
}))

// Кэш для selectSortedScenes — предотвращает создание нового массива при каждом вызове
let _cachedSortedScenes: EnhancedScene[] = []
let _cachedScenesMap: Map<string, EnhancedScene> | null = null

export const selectSortedScenes = (state: CompositionStore): EnhancedScene[] => {
  // Возвращаем кэшированный результат если Map не изменился
  if (state.scenes === _cachedScenesMap) {
    return _cachedSortedScenes
  }
  _cachedScenesMap = state.scenes
  _cachedSortedScenes = Array.from(state.scenes.values()).sort((a, b) => a.order - b.order)
  return _cachedSortedScenes
}

export const selectCurrentScene = (state: CompositionStore) =>
  state.currentSceneId ? state.scenes.get(state.currentSceneId) : undefined

export const selectScenesCount = (state: CompositionStore) => state.scenes.size

export const selectHasChanges = (state: CompositionStore) => state.past.length > 0

export const selectCanUndo = (state: CompositionStore) => state.past.length > 0

export const selectCanRedo = (state: CompositionStore) => state.future.length > 0

export const selectProjectAspectRatio = (state: CompositionStore) => state.projectAspectRatio

// Re-export useShallow для удобства
export { useShallow }
