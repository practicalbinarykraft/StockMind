// ============================================================================
// VIDEO RENDERING HELPERS
// ============================================================================
// Вспомогательные функции для преобразования данных

import type { EnhancedScene } from "../scene-layers/scene-layers.dto";

/**
 * Преобразует SceneWithLayers в EnhancedScene для Remotion
 */
export function convertSceneWithLayersToEnhanced(
  sceneWithLayers: any,
  index: number
): EnhancedScene {
  const { sceneId, scene, composition, layers } = sceneWithLayers;

  // Находим слои по типам
  const backgroundLayer = layers.find((l: any) => l.base.layerType === 'background');
  const overlayLayer = layers.find((l: any) => l.base.layerType === 'overlay');
  const textLayer = layers.find((l: any) => l.base.layerType === 'textLayer');

  // Формируем EnhancedScene
  const enhancedScene: EnhancedScene = {
    id: sceneId,
    order: scene.order ?? index,
    text: scene.text ?? '',
    audioUrl: scene.audioUrl,
    durationInFrames: scene.durationInFrames ?? 300, // 10 секунд по умолчанию
    composition: composition
      ? {
          id: composition.id,
          sceneId: composition.sceneId,
          scriptId: composition.scriptId,
          mode: composition.mode ?? 'overlay',
          splitRatio: composition.splitRatio ?? 0.5,
          splitDirection: composition.splitDirection ?? 'horizontal',
          splitOrder: composition.splitOrder ?? 'background-first',
          gridSnapping: composition.gridSnapping ?? false,
          gridSize: composition.gridSize ?? 10,
        }
      : {
          id: `comp-${sceneId}`,
          sceneId,
          scriptId: scene.scriptId ?? '',
          mode: 'overlay',
          splitRatio: 0.5,
          splitDirection: 'horizontal',
          splitOrder: 'background-first',
          gridSnapping: false,
          gridSize: 10,
        },
    layers: {},
  };

  // Добавляем background layer если есть
  if (backgroundLayer?.background) {
    const bg = backgroundLayer.background;
    enhancedScene.layers.background = {
      id: backgroundLayer.base.id,
      sceneId: backgroundLayer.base.sceneId,
      scriptId: backgroundLayer.base.scriptId,
      layerType: 'background',
      order: backgroundLayer.base.order,
      isVisible: backgroundLayer.base.isVisible,
      contentType: bg.contentType ?? 'image',
      sourceUrl: bg.sourceUrl,
      generationPrompt: bg.generationPrompt,
      generationModel: bg.generationModel,
      generationStatus: bg.generationStatus,
      generationJobId: bg.generationJobId,
      dimensions: bg.dimensions,
    };
  }

  // Добавляем overlay layer если есть
  if (overlayLayer?.overlay) {
    const ov = overlayLayer.overlay;
    enhancedScene.layers.overlay = {
      id: overlayLayer.base.id,
      sceneId: overlayLayer.base.sceneId,
      scriptId: overlayLayer.base.scriptId,
      layerType: 'overlay',
      order: overlayLayer.base.order,
      isVisible: overlayLayer.base.isVisible,
      contentType: ov.contentType ?? 'image',
      sourceUrl: ov.sourceUrl,
      position: ov.position ?? { x: 0, y: 0, width: 100, height: 100 },
      aspectLock: ov.aspectLock ?? false,
      minSize: ov.minSize,
      maxSize: ov.maxSize,
      generationPrompt: ov.generationPrompt,
      generationModel: ov.generationModel,
      generationStatus: ov.generationStatus,
      generationJobId: ov.generationJobId,
    };
  }

  // Добавляем text layer если есть
  if (textLayer?.text) {
    const txt = textLayer.text;
    enhancedScene.layers.textLayer = {
      id: textLayer.base.id,
      sceneId: textLayer.base.sceneId,
      scriptId: textLayer.base.scriptId,
      layerType: 'textLayer',
      order: textLayer.base.order,
      isVisible: textLayer.base.isVisible,
      text: txt.text ?? '',
      mode: txt.mode ?? 'static',
      position: txt.position ?? { type: 'bottom' },
      fontSize: txt.fontSize ?? 32,
      fontFamily: txt.fontFamily ?? 'Arial',
      textColor: txt.textColor ?? '#FFFFFF',
      textAlign: txt.textAlign ?? 'center',
      backgroundColor: txt.backgroundColor,
      backgroundOpacity: txt.backgroundOpacity ?? 0.8,
      marqueeSpeed: txt.marqueeSpeed ?? 100,
    };
  }

  return enhancedScene;
}

/**
 * Извлекает projectId из объекта script
 */
export function getProjectIdFromScript(script: any): string {
  return script.projectId ?? script.project_id ?? 'default';
}
