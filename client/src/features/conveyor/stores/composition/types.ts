/**
 * Типы для composition store
 */

import type {
  EnhancedScene,
  BackgroundLayer,
  OverlayLayer,
  TextLayer,
  CompositionMode,
  Position,
  SceneComposition,
  LayerType,
} from '../../types/layers'

export type ProjectAspectRatio = '16:9' | '9:16' | '1:1'

// Состояние store
export interface CompositionState {
  scriptId: string | null
  scenes: Map<string, EnhancedScene>
  currentSceneId: string | null
  projectAspectRatio: ProjectAspectRatio
  isLoading: boolean
  error: string | null
  past: EnhancedScene[][]
  future: EnhancedScene[][]
  savedPastLength: number
}

// Actions store
export interface CompositionActions {
  // Загрузка данных
  loadScript: (scriptId: string) => Promise<void>
  
  // Управление проектом
  setProjectAspectRatio: (ratio: ProjectAspectRatio) => void
  
  // Управление сценами
  setCurrentScene: (sceneId: string) => void
  addScene: (scene: EnhancedScene) => void
  updateScene: (sceneId: string, updates: Partial<EnhancedScene>) => void
  removeScene: (sceneId: string) => void
  
  // Управление слоями
  updateBackgroundLayer: (sceneId: string, updates: Partial<BackgroundLayer>) => void
  updateOverlayLayer: (sceneId: string, updates: Partial<OverlayLayer>) => void
  updateTextLayer: (sceneId: string, updates: Partial<TextLayer>) => void
  
  // Управление композицией
  setCompositionMode: (sceneId: string, mode: CompositionMode) => void
  updateSplitSettings: (sceneId: string, settings: Partial<SceneComposition>) => void
  
  // Drag & drop
  updateOverlayPosition: (sceneId: string, position: Position) => void
  
  // Генерация контента
  generateContent: (
    sceneId: string,
    layerType: 'background' | 'overlay',
    prompt: string,
    model: string,
    type: 'image' | 'video',
    aspectRatio?: string,
    resolution?: string
  ) => Promise<void>
  
  // Загрузка файлов
  uploadFile: (sceneId: string, layerType: LayerType, file: File) => Promise<void>
  
  // Массовые операции со сценами
  applyLayerToAllScenes: (sourceSceneId: string, layerType: 'background' | 'overlay') => Promise<void>
  removeLayerFromOtherScenes: (sourceSceneId: string, layerType: 'background' | 'overlay') => Promise<void>
  uploadFileToAllScenes: (layerType: 'background' | 'overlay', file: File) => Promise<void>
  
  // Управление наличием слоёв на сцене
  removeLayer: (sceneId: string, layerType: 'background' | 'overlay') => Promise<void>
  addLayer: (sceneId: string, layerType: 'background' | 'overlay') => Promise<void>
  
  // История
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  markSaved: () => void
  
  // Утилиты
  reset: () => void
  getCurrentScene: () => EnhancedScene | undefined
}

// Полный тип store
export type CompositionStore = CompositionState & CompositionActions

// Начальное состояние
export const initialState: CompositionState = {
  scriptId: null,
  scenes: new Map(),
  currentSceneId: null,
  projectAspectRatio: '9:16',
  isLoading: false,
  error: null,
  past: [],
  future: [],
  savedPastLength: 0,
}
