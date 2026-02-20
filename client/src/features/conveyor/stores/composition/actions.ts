/**
 * Actions для управления сценами и слоями (без backend синхронизации)
 */

import type { StateCreator } from 'zustand'
import type {
  EnhancedScene,
  BackgroundLayer,
  OverlayLayer,
  TextLayer,
  CompositionMode,
  Position,
  SceneComposition,
} from '../../types/layers'
import type { CompositionStore, ProjectAspectRatio } from './types'
import { initialState } from './types'

/** Создаёт дефолтный BackgroundLayer, если слой ещё не существует */
const createDefaultBackgroundLayer = (sceneId: string, scriptId: string): BackgroundLayer => ({
  id: `bg-${sceneId}`,
  sceneId,
  scriptId,
  layerType: 'background',
  order: 0,
  isVisible: true,
  contentType: 'avatar',
})

/** Создаёт дефолтный OverlayLayer, если слой ещё не существует */
const createDefaultOverlayLayer = (sceneId: string, scriptId: string): OverlayLayer => ({
  id: `ol-${sceneId}`,
  sceneId,
  scriptId,
  layerType: 'overlay',
  order: 1,
  isVisible: true,
  contentType: 'image',
  position: { x: 25, y: 25, width: 50, height: 50 },
  objectFit: 'contain',
  aspectLock: true,
})

export const createSceneActions: StateCreator<
  CompositionStore,
  [],
  [],
  Pick<
    CompositionStore,
    | 'setProjectAspectRatio'
    | 'setCurrentScene'
    | 'addScene'
    | 'updateScene'
    | 'removeScene'
    | 'undo'
    | 'redo'
    | 'canUndo'
    | 'canRedo'
    | 'getCurrentScene'
    | 'reset'
  >
> = (set, get) => ({
  setProjectAspectRatio: (ratio: ProjectAspectRatio) => {
    set({ projectAspectRatio: ratio })
  },

  setCurrentScene: (sceneId: string) => {
    const { scenes } = get()
    if (scenes.has(sceneId)) {
      set({ currentSceneId: sceneId })
    }
  },

  addScene: (scene: EnhancedScene) => {
    const { scenes, past } = get()
    const newScenes = new Map(scenes)
    newScenes.set(scene.id, scene)

    set({
      scenes: newScenes,
      past: [...past, Array.from(scenes.values())],
      future: [],
    })
  },

  updateScene: (sceneId: string, updates: Partial<EnhancedScene>) => {
    const { scenes, past } = get()
    const scene = scenes.get(sceneId)
    if (!scene) return

    const newScenes = new Map(scenes)
    newScenes.set(sceneId, { ...scene, ...updates })

    set({
      scenes: newScenes,
      past: [...past, Array.from(scenes.values())],
      future: [],
    })
  },

  removeScene: (sceneId: string) => {
    const { scenes, past, currentSceneId } = get()
    const newScenes = new Map(scenes)
    newScenes.delete(sceneId)

    let newCurrentSceneId = currentSceneId
    if (currentSceneId === sceneId) {
      const scenesArray = Array.from(newScenes.values())
      newCurrentSceneId = scenesArray[0]?.id || null
    }

    set({
      scenes: newScenes,
      currentSceneId: newCurrentSceneId,
      past: [...past, Array.from(scenes.values())],
      future: [],
    })
  },

  undo: () => {
    const { past, scenes } = get()
    if (past.length === 0) return

    const newPast = [...past]
    const previous = newPast.pop()
    if (!previous) return

    set({
      past: newPast,
      future: [...get().future, Array.from(scenes.values())],
      scenes: new Map(previous.map((s) => [s.id, s])),
    })
  },

  redo: () => {
    const { future, scenes } = get()
    if (future.length === 0) return

    const newFuture = [...future]
    const next = newFuture.pop()
    if (!next) return

    set({
      future: newFuture,
      past: [...get().past, Array.from(scenes.values())],
      scenes: new Map(next.map((s) => [s.id, s])),
    })
  },

  canUndo: () => get().past.length > 0,

  canRedo: () => get().future.length > 0,

  getCurrentScene: () => {
    const { currentSceneId, scenes } = get()
    if (!currentSceneId) return undefined
    return scenes.get(currentSceneId)
  },

  reset: () => {
    set(initialState)
  },
})

// Helper для обновления сцены
const updateSceneHelper = (
  get: () => CompositionStore,
  set: (partial: Partial<CompositionStore>) => void,
  sceneId: string,
  updater: (scene: EnhancedScene) => EnhancedScene
) => {
  const { scenes, past } = get()
  const scene = scenes.get(sceneId)
  if (!scene) return

  const newScenes = new Map(scenes)
  newScenes.set(sceneId, updater(scene))

  set({
    scenes: newScenes,
    past: [...past, Array.from(scenes.values())],
    future: [],
  })
}

export const createLayerActions: StateCreator<
  CompositionStore,
  [],
  [],
  Pick<
    CompositionStore,
    | 'updateBackgroundLayer'
    | 'updateOverlayLayer'
    | 'updateTextLayer'
    | 'setCompositionMode'
    | 'updateSplitSettings'
    | 'updateOverlayPosition'
    | 'applyLayerToAllScenes'
  >
> = (set, get) => ({
  updateBackgroundLayer: (sceneId: string, updates: Partial<BackgroundLayer>) => {
    const { scriptId } = get()
    updateSceneHelper(get, set, sceneId, (scene) => ({
      ...scene,
      layers: {
        ...scene.layers,
        background: {
          ...(scene.layers.background || createDefaultBackgroundLayer(sceneId, scriptId || '')),
          ...updates,
        },
      },
    }))
  },

  updateOverlayLayer: (sceneId: string, updates: Partial<OverlayLayer>) => {
    const { scriptId } = get()
    updateSceneHelper(get, set, sceneId, (scene) => ({
      ...scene,
      layers: {
        ...scene.layers,
        overlay: {
          ...(scene.layers.overlay || createDefaultOverlayLayer(sceneId, scriptId || '')),
          ...updates,
        },
      },
    }))
  },

  updateTextLayer: (sceneId: string, updates: Partial<TextLayer>) => {
    updateSceneHelper(get, set, sceneId, (scene) => ({
      ...scene,
      layers: {
        ...scene.layers,
        textLayer: scene.layers.textLayer
          ? { ...scene.layers.textLayer, ...updates }
          : undefined,
      },
    }))
  },

  setCompositionMode: (sceneId: string, mode: CompositionMode) => {
    updateSceneHelper(get, set, sceneId, (scene) => ({
      ...scene,
      composition: { ...scene.composition, mode },
    }))
  },

  updateSplitSettings: (sceneId: string, settings: Partial<SceneComposition>) => {
    updateSceneHelper(get, set, sceneId, (scene) => ({
      ...scene,
      composition: { ...scene.composition, ...settings },
    }))
  },

  updateOverlayPosition: (sceneId: string, position: Position) => {
    updateSceneHelper(get, set, sceneId, (scene) => ({
      ...scene,
      layers: {
        ...scene.layers,
        overlay: scene.layers.overlay
          ? { ...scene.layers.overlay, position }
          : undefined,
      },
    }))
  },

  applyLayerToAllScenes: (sourceSceneId: string, layerType: 'background' | 'overlay') => {
    const { scenes, past, scriptId } = get()
    const sourceScene = scenes.get(sourceSceneId)
    if (!sourceScene || !scriptId) return

    const sourceLayer = layerType === 'background'
      ? sourceScene.layers.background
      : sourceScene.layers.overlay
    if (!sourceLayer?.sourceUrl) return

    const FPS = 30
    const newScenes = new Map(scenes)

    Array.from(newScenes.entries()).forEach(([sceneId, scene]) => {
      if (sceneId === sourceSceneId) return

      const sceneDurationSec = scene.durationInFrames / FPS
      const videoMeta = sourceLayer.contentType === 'video'
        ? { videoStartTime: 0, videoEndTime: sceneDurationSec }
        : {}

      if (layerType === 'background') {
        const existing = scene.layers.background || createDefaultBackgroundLayer(sceneId, scriptId)
        newScenes.set(sceneId, {
          ...scene,
          layers: {
            ...scene.layers,
            background: {
              ...existing,
              contentType: sourceLayer.contentType,
              sourceUrl: sourceLayer.sourceUrl,
              generationStatus: undefined,
              generationJobId: undefined,
              generationPrompt: sourceLayer.generationPrompt,
              metadata: { ...(existing.metadata || {}), ...videoMeta },
            },
          },
        })
      } else {
        const existing = scene.layers.overlay || createDefaultOverlayLayer(sceneId, scriptId)
        const srcOverlay = sourceScene.layers.overlay
        newScenes.set(sceneId, {
          ...scene,
          layers: {
            ...scene.layers,
            overlay: {
              ...existing,
              contentType: sourceLayer.contentType,
              sourceUrl: sourceLayer.sourceUrl,
              generationStatus: undefined,
              generationJobId: undefined,
              generationPrompt: sourceLayer.generationPrompt,
              position: srcOverlay?.position ?? existing.position,
              objectFit: srcOverlay?.objectFit ?? existing.objectFit,
              aspectLock: srcOverlay?.aspectLock ?? existing.aspectLock,
              metadata: { ...(existing.metadata || {}), ...videoMeta },
            },
          },
        })
      }
    })

    set({
      scenes: newScenes,
      past: [...past, Array.from(scenes.values())],
      future: [],
    })
  },
})
