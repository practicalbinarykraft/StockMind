/**
 * Синхронизация store с backend через layersService
 */

import type { StateCreator } from 'zustand'
import type { LayerType } from '../../types/layers'
import type { CompositionStore } from './types'
import { layersService } from '../../services/layers'

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
        data.scenes.map((sceneData: any) => {
          // Backend возвращает вложенную структуру { base, background?, overlay?, text? }
          // Сливаем в плоские объекты, совместимые с фронтенд-типами
          const flatLayers = (sceneData.layers || []).map((l: any) => {
            const base = l.base || {}
            if (base.layerType === 'background' && l.background) {
              return { ...l.background, ...base }
            }
            if (base.layerType === 'overlay' && l.overlay) {
              return { ...l.overlay, ...base }
            }
            if (base.layerType === 'textLayer' && l.text) {
              return {
                ...l.text,
                ...base,
                // Гарантируем дефолты для полей, которые ожидает TextTab
                fontSize: l.text.fontSize ?? 32,
                fontFamily: l.text.fontFamily ?? 'Inter',
                textColor: l.text.textColor ?? '#FFFFFF',
                textAlign: l.text.textAlign ?? 'center',
                backgroundOpacity: l.text.backgroundOpacity ?? 0.8,
                marqueeSpeed: l.text.marqueeSpeed ?? 100,
                mode: l.text.mode ?? 'static',
                position: l.text.position ?? { type: 'bottom' },
              }
            }
            return base
          })

          const layers = {
            background: flatLayers.find((l: any) => l.layerType === 'background') || undefined,
            overlay: flatLayers.find((l: any) => l.layerType === 'overlay') || undefined,
            textLayer: flatLayers.find((l: any) => l.layerType === 'textLayer') || undefined,
          }

          const defaultComposition = {
            mode: 'overlay' as const,
            splitRatio: 0.5,
            splitDirection: 'horizontal' as const,
            splitOrder: 'background-first' as const,
            gridSnapping: false,
            gridSize: 10,
          }

          // Текст и порядок лежат в sceneData.scene (вложенный объект от backend)
          const sceneInfo = sceneData.scene || {}
          const sceneText = sceneInfo.text || sceneData.text || ''
          const sceneOrder = sceneInfo.order ?? sceneData.order ?? 0

          // Длительность на основе текста: ~15 символов/сек (темп чтения), мин. 3 сек
          const FPS = 30
          const CHARS_PER_SECOND = 15
          const MIN_DURATION_SECONDS = 3
          const textDurationSec = sceneText
            ? Math.max(sceneText.length / CHARS_PER_SECOND, MIN_DURATION_SECONDS)
            : MIN_DURATION_SECONDS
          const durationInFrames = sceneData.durationInFrames || Math.ceil(textDurationSec * FPS)

          return [
            sceneData.sceneId,
            {
              id: sceneData.sceneId,
              order: sceneOrder,
              text: sceneText,
              durationInFrames,
              composition: sceneData.composition || defaultComposition,
              layers: layers as any,
            },
          ]
        })
      )

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
    type: 'image' | 'video'
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
      if (type === 'image') {
        const result = await layersService.generateImage({
          prompt,
          model: model as any,
          aspectRatio: '16:9',
        })
        jobId = result.jobId
      } else {
        const result = await layersService.generateVideo({
          prompt,
          model: 'kling-ai-video',
          aspectRatio: '16:9',
        })
        jobId = result.jobId
      }

      // Обновляем jobId в слое
      if (layerType === 'background') {
        get().updateBackgroundLayer(sceneId, { generationJobId: jobId })
      } else {
        get().updateOverlayLayer(sceneId, { generationJobId: jobId })
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
