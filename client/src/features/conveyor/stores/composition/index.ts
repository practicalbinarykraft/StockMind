/**
 * Главный composition store - объединяет все части
 */

import { create } from 'zustand'
import { initialState, type CompositionStore } from './types'
import { createSceneActions, createLayerActions } from './actions'
import { createSyncActions } from './sync'

export const useCompositionStore = create<CompositionStore>()((...args) => ({
  ...initialState,
  ...createSceneActions(...args),
  ...createLayerActions(...args),
  ...createSyncActions(...args),
}))

// Селекторы
export const selectSortedScenes = (state: CompositionStore) =>
  Array.from(state.scenes.values()).sort((a, b) => a.order - b.order)

export const selectCurrentScene = (state: CompositionStore) =>
  state.currentSceneId ? state.scenes.get(state.currentSceneId) : undefined

export const selectScenesCount = (state: CompositionStore) => state.scenes.size

export const selectHasChanges = (state: CompositionStore) => state.past.length > 0
