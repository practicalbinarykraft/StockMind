import { create } from 'zustand'
import type { Scene, Script } from '../../types'

interface PipelineState {
  scenes: Scene[]
  fps: number
  currentFrame: number
  aspectRatio: '9:16' | '16:9'
  scriptId: string | null
  
  // Actions
  addScene: (scene: Scene) => void
  updateScene: (id: string, updates: Partial<Scene>) => void
  removeScene: (id: string) => void
  reorderScenes: (fromIndex: number, toIndex: number) => void
  totalDuration: () => number
  setAspectRatio: (ratio: '9:16' | '16:9') => void
  setCurrentFrame: (frame: number) => void
  loadScript: (script: Script) => void
  reset: () => void
}

// Дефолтные настройки для новой сцены
const createDefaultScene = (order: number): Scene => ({
  id: crypto.randomUUID(),
  order,
  text: '',
  alternatives: [],
  visualSource: null,
  mediaType: 'image',
  durationInFrames: 90, // 3 секунды при fps=30
  textPosition: 'bottom',
  fontSize: 45,
  textAlign: 'center',
  textColor: '#ffffff',
  textAnimation: 'word-by-word',
  mediaAnimation: 'zoom-in',
  isGenerating: false,
})

const initialState: Omit<PipelineState, 'totalDuration' | 'addScene' | 'updateScene' | 'removeScene' | 'reorderScenes' | 'setAspectRatio' | 'setCurrentFrame' | 'loadScript' | 'reset'> = {
  scenes: [],
  fps: 30,
  currentFrame: 0,
  aspectRatio: '9:16',
  scriptId: null,
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  ...initialState,

  addScene: (scene) => {
    set((state) => ({
      scenes: [...state.scenes, scene],
    }))
  },

  updateScene: (id, updates) => {
    set((state) => ({
      scenes: state.scenes.map((scene) =>
        scene.id === id ? { ...scene, ...updates } : scene
      ),
    }))
  },

  removeScene: (id) => {
    set((state) => ({
      scenes: state.scenes.filter((scene) => scene.id !== id),
    }))
  },

  reorderScenes: (fromIndex, toIndex) => {
    set((state) => {
      const newScenes = [...state.scenes]
      const [moved] = newScenes.splice(fromIndex, 1)
      newScenes.splice(toIndex, 0, moved)
      // Обновляем порядок
      return {
        scenes: newScenes.map((scene, index) => ({
          ...scene,
          order: index + 1,
        })),
      }
    })
  },

  totalDuration: () => {
    const state = get()
    return state.scenes.reduce(
      (total, scene) => total + (scene.durationInFrames || 90),
      0
    )
  },

  setAspectRatio: (ratio) => {
    set({ aspectRatio: ratio })
  },

  setCurrentFrame: (frame) => {
    set({ currentFrame: frame })
  },

  loadScript: (script) => {
    // Преобразуем сцены из Script в формат Pipeline
    const pipelineScenes: Scene[] = script.scenes.map((scene, index) => ({
      ...scene,
      // Устанавливаем дефолты для новых полей, если их нет
      durationInFrames: scene.durationInFrames || 90,
      visualSource: scene.visualSource ?? null,
      mediaType: scene.mediaType || 'image',
      textPosition: scene.textPosition || 'bottom',
      fontSize: scene.fontSize || 45,
      textAlign: scene.textAlign || 'center',
      textColor: scene.textColor || '#ffffff',
      textAnimation: scene.textAnimation || 'word-by-word',
      mediaAnimation: scene.mediaAnimation || 'zoom-in',
      isGenerating: false,
    }))

    set({
      scenes: pipelineScenes,
      scriptId: script.id,
    })
  },

  reset: () => {
    set(initialState)
  },
}))

// Экспортируем функцию для создания новой сцены
export { createDefaultScene }
