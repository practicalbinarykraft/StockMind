/**
 * Синхронизация store с backend через layersService
 */

import type { StateCreator } from 'zustand'
import type { LayerType } from '../../types/layers'
import type { CompositionStore } from './types'
import { layersService } from '../../services/layers'

const FPS = 30
const WORDS_PER_SECOND = 2.2
const MIN_DURATION_SECONDS = 3

const DEFAULT_COMPOSITION = {
  mode: 'overlay' as const,
  splitRatio: 0.5,
  splitDirection: 'horizontal' as const,
  splitOrder: 'background-first' as const,
  gridSnapping: false,
  gridSize: 10,
}

/**
 * Сливает вложенную структуру слоя { base, background?, overlay?, text? }
 * от backend в плоский объект, совместимый с фронтенд-типами.
 * Если формат уже плоский (есть layerType на верхнем уровне) — возвращает as-is.
 */
function flattenLayer(rawLayer: any): any {
  // Уже плоский формат
  if (rawLayer.layerType) return rawLayer

  const base = rawLayer.base
  if (!base) return rawLayer

  const ext = rawLayer.background || rawLayer.overlay || rawLayer.text || {}
  return { ...ext, ...base }
}

/**
 * Генерирует дефолтные слои для сцены, если backend не вернул их
 */
function ensureDefaultLayers(
  layers: { background?: any; overlay?: any; textLayer?: any },
  sceneId: string,
  scriptId: string,
) {
  if (!layers.background) {
    layers.background = {
      id: `default-bg-${sceneId}`,
      sceneId,
      scriptId,
      layerType: 'background',
      order: 0,
      isVisible: true,
      contentType: 'avatar',
    }
  }
  if (!layers.overlay) {
    layers.overlay = {
      id: `default-ol-${sceneId}`,
      sceneId,
      scriptId,
      layerType: 'overlay',
      order: 1,
      isVisible: true,
      contentType: 'image',
      position: { x: 25, y: 25, width: 50, height: 50 },
      aspectLock: true,
    }
  }
  if (!layers.textLayer) {
    layers.textLayer = {
      id: `default-text-${sceneId}`,
      sceneId,
      scriptId,
      layerType: 'textLayer',
      order: 2,
      isVisible: true,
      text: '',
      mode: 'static',
      position: { type: 'bottom' },
      fontSize: 32,
      fontFamily: 'Inter',
      textColor: '#FFFFFF',
      textAlign: 'center',
      backgroundOpacity: 0.8,
      marqueeSpeed: 100,
    }
  }
  return layers
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length || 1
}

function calculateDuration(text: string): number {
  if (!text) return MIN_DURATION_SECONDS * FPS
  const sec = Math.max(countWords(text) / WORDS_PER_SECOND, MIN_DURATION_SECONDS)
  return Math.ceil(sec * FPS)
}

export const createSyncActions: StateCreator<
  CompositionStore,
  [],
  [],
  Pick<CompositionStore, 'loadScript' | 'generateContent' | 'uploadFile'>
> = (set, get) => ({
  loadScript: async (scriptId: string) => {
    set({ isLoading: true, error: null, scriptId })

    try {
      const data = await layersService.getScriptWithLayers(scriptId)

      const scenesMap = new Map(
        data.scenes.map((sceneData: any, index: number) => {
          const rawLayers = sceneData.layers || []
          const flat = rawLayers.map(flattenLayer)

          const layers: any = {
            background: flat.find((l: any) => l.layerType === 'background') || undefined,
            overlay: flat.find((l: any) => l.layerType === 'overlay') || undefined,
            textLayer: flat.find((l: any) => l.layerType === 'textLayer') || undefined,
          }

          // Гарантируем дефолтные значения для полей текстового слоя
          if (layers.textLayer) {
            layers.textLayer = {
              ...layers.textLayer,
              fontSize: layers.textLayer.fontSize ?? 32,
              fontFamily: layers.textLayer.fontFamily ?? 'Inter',
              textColor: layers.textLayer.textColor ?? '#FFFFFF',
              textAlign: layers.textLayer.textAlign ?? 'center',
              backgroundOpacity: layers.textLayer.backgroundOpacity ?? 0.8,
              marqueeSpeed: layers.textLayer.marqueeSpeed ?? 100,
              mode: layers.textLayer.mode ?? 'static',
              position: layers.textLayer.position ?? { type: 'bottom' },
            }
          }

          // Background без sourceUrl и с contentType 'image' — старый дефолт,
          // заменяем на 'avatar' чтобы видео аватара подтягивалось автоматически
          if (layers.background && !layers.background.sourceUrl && layers.background.contentType === 'image') {
            layers.background = { ...layers.background, contentType: 'avatar' }
          }

          // Если слои отсутствуют — создаём дефолтные in-memory
          ensureDefaultLayers(layers, sceneData.sceneId, scriptId)

          // Backend возвращает текст/порядок во вложенном .scene
          const sceneInfo = sceneData.scene || {}
          const sceneText = sceneInfo.text || sceneData.text || ''
          const sceneOrder = sceneInfo.order ?? sceneData.order ?? index

          const durationInFrames = sceneData.durationInFrames
            || sceneInfo.durationInFrames
            || (sceneInfo.duration ? Math.ceil(sceneInfo.duration * FPS) : 0)
            || calculateDuration(sceneText)

          const composition = sceneData.composition || DEFAULT_COMPOSITION

          return [
            sceneData.sceneId,
            {
              id: sceneData.sceneId,
              order: sceneOrder,
              text: sceneText,
              durationInFrames,
              composition,
              layers,
            },
          ]
        })
      )

      // Фоново создаём дефолтные слои на backend для сцен без слоёв
      const scenesWithoutLayers = data.scenes.filter(
        (s: any) => !s.layers || s.layers.length === 0
      )
      for (const s of scenesWithoutLayers) {
        layersService.createDefaultSceneLayers(scriptId, s.sceneId).catch(() => {})
      }

      set({
        scenes: scenesMap as Map<string, any>,
        currentSceneId: scenesMap.size > 0 ? (Array.from(scenesMap.keys())[0] as string) : null,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load script',
        isLoading: false,
      })
    }
  },

  generateContent: async (
    sceneId: string,
    layerType: 'background' | 'overlay',
    prompt: string,
    model: string,
    type: 'image' | 'video',
    aspectRatio?: string
  ) => {
    const scene = get().scenes.get(sceneId)
    if (!scene) return

    try {
      // Устанавливаем статус "processing"
      if (layerType === 'background' && scene.layers.background) {
        get().updateBackgroundLayer(sceneId, {
          generationStatus: 'processing',
          generationPrompt: prompt,
          generationModel: model,
        })
      } else if (layerType === 'overlay' && scene.layers.overlay) {
        get().updateOverlayLayer(sceneId, {
          generationStatus: 'processing',
          generationPrompt: prompt,
          generationModel: model,
        })
      }

      // Запускаем генерацию через Kie.ai API
      let jobId: string
      let contentType: 'image' | 'video'
      if (type === 'image') {
        const result = await layersService.generateImage({
          prompt,
          model: model as any,
          aspectRatio: (aspectRatio as any) ?? '9:16',
        })
        jobId = result.jobId
        contentType = 'image'
      } else {
        const result = await layersService.generateVideo({
          prompt,
          model: 'kling-ai-video',
          aspectRatio: (aspectRatio as '16:9' | '9:16') ?? '9:16',
        })
        jobId = result.jobId
        contentType = 'video'
      }

      // Обновляем jobId и contentType в слое
      if (layerType === 'background') {
        get().updateBackgroundLayer(sceneId, { generationJobId: jobId, contentType })
      } else {
        get().updateOverlayLayer(sceneId, { generationJobId: jobId, contentType })
      }
    } catch (error) {
      console.error('Generation failed:', error)

      // Устанавливаем статус "failed"
      if (layerType === 'background') {
        get().updateBackgroundLayer(sceneId, { generationStatus: 'failed' })
      } else {
        get().updateOverlayLayer(sceneId, { generationStatus: 'failed' })
      }
    }
  },

  uploadFile: async (sceneId: string, layerType: LayerType, file: File) => {
    const scene = get().scenes.get(sceneId)
    if (!scene) return

    const layer =
      layerType === 'background'
        ? scene.layers.background
        : layerType === 'overlay'
          ? scene.layers.overlay
          : scene.layers.textLayer

    if (!layer) return

    try {
      const { scriptId } = get()
      if (!scriptId) throw new Error('Script ID not set')

      const { sourceUrl } = await layersService.uploadLayerFile(
        scriptId,
        layer.id,
        file,
        layerType
      )

      // Обновляем соответствующий слой
      if (layerType === 'background') {
        get().updateBackgroundLayer(sceneId, { sourceUrl })
      } else if (layerType === 'overlay') {
        get().updateOverlayLayer(sceneId, { sourceUrl })
      }
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    }
  },
})
