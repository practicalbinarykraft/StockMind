/**
 * Синхронизация store с backend через layersService
 */

import type { StateCreator } from 'zustand'
import type { LayerType, ContentType, BackgroundLayer, OverlayLayer } from '../../types/layers'
import type { CompositionStore } from './types'
import { layersService } from '../../services/layers'
import { createDefaultBackgroundLayer, createDefaultOverlayLayer } from './actions'

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
 * Гарантирует наличие textLayer (он всегда должен быть на сцене).
 * background и overlay могут отсутствовать — это значит, что пользователь их удалил.
 */
function ensureTextLayer(
  layers: { background?: any; overlay?: any; textLayer?: any },
  sceneId: string,
  scriptId: string,
) {
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

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video metadata'))
    }
    video.src = URL.createObjectURL(file)
  })
}

export const createSyncActions: StateCreator<
  CompositionStore,
  [],
  [],
  Pick<CompositionStore, 'loadScript' | 'generateContent' | 'uploadFile' | 'uploadFileToAllScenes' | 'removeLayer' | 'addLayer' | 'removeLayerFromOtherScenes' | 'applyLayerToAllScenes'>
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

          // Гарантируем дефолтные значения для overlay-слоя
          if (layers.overlay) {
            layers.overlay = {
              ...layers.overlay,
              objectFit: layers.overlay.objectFit ?? 'contain',
            }
          }

          // Background без sourceUrl и с contentType 'image' — старый дефолт,
          // заменяем на 'avatar' чтобы видео аватара подтягивалось автоматически
          if (
            layers.background &&
            !layers.background.sourceUrl &&
            layers.background.contentType === 'image'
          ) {
            layers.background = { ...layers.background, contentType: 'avatar' }
          }

          // textLayer всегда должен быть; background и overlay могут отсутствовать
          ensureTextLayer(layers, sceneData.sceneId, scriptId)

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
    aspectRatio?: string,
    resolution?: string,
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
          resolution: (resolution as any) ?? '2K',
        })
        jobId = result.jobId
        contentType = 'image'
      } else {
        const sceneDurationSec = scene.durationInFrames / FPS
        const duration = sceneDurationSec > 5 ? 10 : 5

        const result = await layersService.generateVideo({
          prompt,
          model: 'kling-ai-video',
          aspectRatio: (aspectRatio as '16:9' | '9:16') ?? '9:16',
          duration,
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

  uploadFileToAllScenes: async (layerType: 'background' | 'overlay', file: File) => {
    const { scriptId, currentSceneId } = get()
    if (!scriptId || !currentSceneId) throw new Error('Script ID or Scene ID not set')

    const currentScene = get().scenes.get(currentSceneId)
    if (!currentScene) throw new Error('Current scene not found')

    const layer = layerType === 'background'
      ? currentScene.layers.background
      : currentScene.layers.overlay
    if (!layer) throw new Error('Layer not found')

    const { sourceUrl } = await layersService.uploadLayerFile(scriptId, layer.id, file, layerType)

    const isVideo = file.type.startsWith('video/')
    const contentType: ContentType = isVideo ? 'video' : 'image'

    let videoDuration: number | undefined
    if (isVideo) {
      try {
        videoDuration = await getVideoDuration(file)
      } catch {
        // Продолжаем без метаданных тайминга
      }
    }

    const sortedScenes = Array.from(get().scenes.values()).sort((a, b) => a.order - b.order)
    const totalScenesDuration = sortedScenes.reduce((sum, s) => sum + s.durationInFrames / FPS, 0)
    const effectiveVideoDuration = videoDuration
      ? Math.min(videoDuration, totalScenesDuration)
      : undefined

    const newScenes = new Map(get().scenes)
    let currentOffset = 0

    for (const scene of sortedScenes) {
      const sceneDurationSec = scene.durationInFrames / FPS
      const existingScene = newScenes.get(scene.id)!

      const timingMeta: Record<string, any> = {}
      if (isVideo && effectiveVideoDuration !== undefined) {
        const endTime = Math.min(currentOffset + sceneDurationSec, effectiveVideoDuration)
        timingMeta.videoStartTime = currentOffset
        timingMeta.videoEndTime = endTime
        currentOffset = endTime
      }

      if (layerType === 'background') {
        const existing = existingScene.layers.background
        const base: BackgroundLayer = existing || createDefaultBackgroundLayer(scene.id, scriptId)
        newScenes.set(scene.id, {
          ...existingScene,
          layers: {
            ...existingScene.layers,
            background: {
              ...base,
              contentType,
              sourceUrl,
              generationStatus: undefined,
              generationJobId: undefined,
              metadata: { ...(existing?.metadata || {}), ...timingMeta },
            },
          },
        })
      } else {
        const existing = existingScene.layers.overlay
        const base: OverlayLayer = existing || createDefaultOverlayLayer(scene.id, scriptId)
        newScenes.set(scene.id, {
          ...existingScene,
          layers: {
            ...existingScene.layers,
            overlay: {
              ...base,
              contentType,
              sourceUrl,
              generationStatus: undefined,
              generationJobId: undefined,
              metadata: { ...(existing?.metadata || {}), ...timingMeta },
            },
          },
        })
      }
    }

    set({
      scenes: newScenes,
      past: [...get().past, Array.from(get().scenes.values())],
      future: [],
    })
  },

  removeLayer: async (sceneId: string, layerType: 'background' | 'overlay') => {
    const { scenes, scriptId, past } = get()
    const scene = scenes.get(sceneId)
    if (!scene || !scriptId) return

    const layer = layerType === 'background' ? scene.layers.background : scene.layers.overlay
    if (!layer) return

    try {
      await layersService.deleteLayer(scriptId, layer.id)
    } catch (err) {
      console.error('Failed to delete layer from DB:', err)
    }

    const newScenes = new Map(scenes)
    const updatedLayers = { ...scene.layers }
    if (layerType === 'background') {
      updatedLayers.background = undefined
    } else {
      updatedLayers.overlay = undefined
    }
    newScenes.set(sceneId, { ...scene, layers: updatedLayers })

    set({
      scenes: newScenes,
      past: [...past, Array.from(scenes.values())],
      future: [],
    })
  },

  addLayer: async (sceneId: string, layerType: 'background' | 'overlay') => {
    const { scriptId, scenes, past } = get()
    if (!scriptId) return
    const scene = scenes.get(sceneId)
    if (!scene) return

    const created = await layersService.createLayer(scriptId, sceneId, {
      sceneId,
      scriptId,
      layerType,
      order: layerType === 'background' ? 0 : 1,
      isVisible: true,
    })

    const newScenes = new Map(scenes)
    const updatedLayers = { ...scene.layers }

    if (layerType === 'background') {
      updatedLayers.background = {
        id: created.id,
        sceneId,
        scriptId,
        layerType: 'background',
        order: 0,
        isVisible: true,
        contentType: 'image',
        ...(created as any),
      } as BackgroundLayer
    } else {
      updatedLayers.overlay = {
        id: created.id,
        sceneId,
        scriptId,
        layerType: 'overlay',
        order: 1,
        isVisible: true,
        contentType: 'image',
        position: { x: 25, y: 25, width: 50, height: 50 },
        objectFit: 'contain',
        aspectLock: true,
        ...(created as any),
      } as OverlayLayer
    }
    newScenes.set(sceneId, { ...scene, layers: updatedLayers })

    set({
      scenes: newScenes,
      past: [...past, Array.from(scenes.values())],
      future: [],
    })
  },

  removeLayerFromOtherScenes: async (sourceSceneId: string, layerType: 'background' | 'overlay') => {
    const { scenes, past, scriptId } = get()
    if (!scriptId) return

    const deletePromises: Promise<any>[] = []
    const newScenes = new Map(scenes)

    Array.from(newScenes.entries()).forEach(([sceneId, scene]) => {
      if (sceneId === sourceSceneId) return

      const layer = layerType === 'background' ? scene.layers.background : scene.layers.overlay
      if (!layer) return

      deletePromises.push(
        layersService.deleteLayer(scriptId, layer.id).catch((err) =>
          console.error(`Failed to delete layer ${layer.id}:`, err)
        )
      )

      const updatedLayers = { ...scene.layers }
      if (layerType === 'background') {
        updatedLayers.background = undefined
      } else {
        updatedLayers.overlay = undefined
      }
      newScenes.set(sceneId, { ...scene, layers: updatedLayers })
    })

    await Promise.all(deletePromises)

    set({
      scenes: newScenes,
      past: [...past, Array.from(scenes.values())],
      future: [],
    })
  },

  applyLayerToAllScenes: async (sourceSceneId: string, layerType: 'background' | 'overlay') => {
    const { scenes, past, scriptId } = get()
    const sourceScene = scenes.get(sourceSceneId)
    if (!sourceScene || !scriptId) return

    const sourceLayer = layerType === 'background'
      ? sourceScene.layers.background
      : sourceScene.layers.overlay
    if (!sourceLayer?.sourceUrl) return

    const FPS = 30

    // Создаём слои в БД для сцен, где они отсутствуют
    const layerCreations: Array<{ sceneId: string; promise: Promise<any> }> = []
    Array.from(scenes.entries()).forEach(([sceneId, scene]) => {
      if (sceneId === sourceSceneId) return
      const existing = layerType === 'background' ? scene.layers.background : scene.layers.overlay
      if (!existing) {
        layerCreations.push({
          sceneId,
          promise: layersService.createLayer(scriptId, sceneId, {
            sceneId,
            scriptId,
            layerType,
            order: layerType === 'background' ? 0 : 1,
            isVisible: true,
          }),
        })
      }
    })

    const createdLayers = new Map<string, any>()
    for (const { sceneId, promise } of layerCreations) {
      try {
        createdLayers.set(sceneId, await promise)
      } catch (err) {
        console.error(`Failed to create layer for scene ${sceneId}:`, err)
      }
    }

    // Обновляем store — re-get на случай изменений во время await
    const currentScenes = get().scenes
    const newScenes = new Map(currentScenes)

    Array.from(newScenes.entries()).forEach(([sceneId, scene]) => {
      if (sceneId === sourceSceneId) return

      let existing = layerType === 'background' ? scene.layers.background : scene.layers.overlay

      if (!existing && createdLayers.has(sceneId)) {
        const created = createdLayers.get(sceneId)
        if (layerType === 'background') {
          existing = { ...createDefaultBackgroundLayer(sceneId, scriptId), id: created.id }
        } else {
          existing = { ...createDefaultOverlayLayer(sceneId, scriptId), id: created.id }
        }
      }

      if (!existing) return

      const sceneDurationSec = scene.durationInFrames / FPS
      const videoMeta = sourceLayer.contentType === 'video'
        ? { videoStartTime: 0, videoEndTime: sceneDurationSec }
        : {}

      if (layerType === 'background') {
        newScenes.set(sceneId, {
          ...scene,
          layers: {
            ...scene.layers,
            background: {
              ...(existing as BackgroundLayer),
              contentType: sourceLayer.contentType,
              sourceUrl: sourceLayer.sourceUrl,
              generationStatus: undefined,
              generationJobId: undefined,
              generationPrompt: sourceLayer.generationPrompt,
              metadata: { ...videoMeta },
            },
          },
        })
      } else {
        const srcOverlay = sourceScene.layers.overlay
        newScenes.set(sceneId, {
          ...scene,
          layers: {
            ...scene.layers,
            overlay: {
              ...(existing as OverlayLayer),
              contentType: sourceLayer.contentType,
              sourceUrl: sourceLayer.sourceUrl,
              generationStatus: undefined,
              generationJobId: undefined,
              generationPrompt: sourceLayer.generationPrompt,
              position: srcOverlay?.position ?? (existing as OverlayLayer).position,
              objectFit: srcOverlay?.objectFit ?? (existing as OverlayLayer).objectFit,
              aspectLock: srcOverlay?.aspectLock ?? (existing as OverlayLayer).aspectLock,
              metadata: { ...videoMeta },
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
