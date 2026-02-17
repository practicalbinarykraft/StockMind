// ============================================================================
// REMOTION SCENE COMPOSITION
// ============================================================================
// Основная композиция для рендеринга сцен с поддержкой:
// - Background, Overlay, TextLayer слоев
// - Overlay и Split режимов композиции
// - Анимации для бегущей строки (marquee)

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { EnhancedScene } from '../types/layers';
import { getCurrentScene } from './Root';
import {
  BackgroundLayerRenderer,
  OverlayLayerRenderer,
  TextLayerRenderer,
  SplitRenderer,
} from './layers';

// ============================================================================
// PROPS INTERFACES
// ============================================================================

export interface SceneCompositionProps {
  scenes?: EnhancedScene[];
  backgroundColor?: string;
}

// ============================================================================
// MAIN COMPOSITION
// ============================================================================

export const SceneComposition: React.FC<SceneCompositionProps> = ({
  scenes = [],
  backgroundColor = '#000000',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Определяем текущую сцену на основе текущего кадра
  const currentSceneData = getCurrentScene(scenes, frame);

  if (!currentSceneData) {
    return (
      <AbsoluteFill style={{ backgroundColor }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 48,
          }}
        >
          No Scene Available
        </div>
      </AbsoluteFill>
    );
  }

  const { scene, sceneStartFrame } = currentSceneData;
  const sceneFrame = frame - sceneStartFrame;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Рендерим композицию сцены */}
      <SceneRenderer
        scene={scene}
        sceneFrame={sceneFrame}
        width={width}
        height={height}
      />

      {/* Аудио для сцены */}
      {scene.audioUrl && (
        <audio src={scene.audioUrl} />
      )}
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE RENDERER
// ============================================================================

interface SceneRendererProps {
  scene: EnhancedScene;
  sceneFrame: number;
  width: number;
  height: number;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  sceneFrame,
  width,
  height,
}) => {
  const { composition, layers } = scene;

  // Overlay режим - фон + overlay поверх + текст
  if (composition.mode === 'overlay') {
    return (
      <>
        {/* Background слой (z-index: 0) */}
        {layers.background && layers.background.isVisible && (
          <BackgroundLayerRenderer
            layer={layers.background}
            sceneFrame={sceneFrame}
            width={width}
            height={height}
          />
        )}

        {/* Overlay слой (z-index: 1) */}
        {layers.overlay && layers.overlay.isVisible && (
          <OverlayLayerRenderer
            layer={layers.overlay}
            sceneFrame={sceneFrame}
            width={width}
            height={height}
          />
        )}

        {/* Text слой (z-index: 2) */}
        {layers.textLayer && layers.textLayer.isVisible && (
          <TextLayerRenderer
            layer={layers.textLayer}
            sceneFrame={sceneFrame}
            sceneDuration={scene.durationInFrames}
            width={width}
            height={height}
          />
        )}
      </>
    );
  }

  // Split режим - разделение canvas на две части
  if (composition.mode === 'split') {
    return (
      <SplitRenderer
        scene={scene}
        sceneFrame={sceneFrame}
        width={width}
        height={height}
      />
    );
  }

  return null;
};
