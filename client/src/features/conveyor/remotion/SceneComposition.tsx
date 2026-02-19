// ============================================================================
// REMOTION SCENE COMPOSITION
// ============================================================================
// Рендерит сцены с поддержкой Background, Overlay, TextLayer слоев.
// Видео-аватар вынесен на уровень композиции как единый <Video> элемент,
// чтобы он НЕ пересоздавался при смене сцен (seekTo вместо re-mount).

import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Video, useCurrentFrame, useVideoConfig } from 'remotion';
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

  // Единый URL видео-аватара (background) — один и тот же для всех сцен
  const avatarBgUrl = useMemo(() => {
    for (const scene of scenes) {
      if (scene.layers.background?.contentType === 'avatar' && scene.layers.background.sourceUrl) {
        return scene.layers.background.sourceUrl;
      }
    }
    return null;
  }, [scenes]);

  // Единый URL видео-аватара (overlay) + позиция + objectFit
  const avatarOverlayConfig = useMemo(() => {
    for (const scene of scenes) {
      const ol = scene.layers.overlay;
      if (ol?.contentType === 'avatar' && ol.sourceUrl) {
        return { url: ol.sourceUrl, position: ol.position, objectFit: ol.objectFit || 'contain' };
      }
    }
    return null;
  }, [scenes]);

  // Аватар можно вынести на уровень композиции только если все сцены в overlay-режиме
  // (в split-режиме аватар обрезается до своей половины — нельзя рендерить full-screen)
  const allOverlayMode = useMemo(
    () => scenes.length > 0 && scenes.every(s => s.composition.mode === 'overlay'),
    [scenes],
  );

  const globalAvatarBg = allOverlayMode ? avatarBgUrl : null;
  const globalAvatarOverlay = allOverlayMode ? avatarOverlayConfig : null;

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

  const sceneUsesAvatarBg = scene.layers.background?.contentType === 'avatar';
  const sceneUsesAvatarOverlay = scene.layers.overlay?.contentType === 'avatar';

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Единый непрерывный видео-аватар (background) — всегда смонтирован,
          чтобы видео не пересоздавалось при смене сцен.
          Для не-аватарных сцен перекрываем непрозрачным фоном сверху. */}
      {globalAvatarBg && (
        <AbsoluteFill>
          <Video
            src={globalAvatarBg}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </AbsoluteFill>
      )}

      {/* Перекрытие: скрывает глобальный аватар для сцен с другим contentType */}
      {globalAvatarBg && !sceneUsesAvatarBg && (
        <AbsoluteFill style={{ backgroundColor }} />
      )}

      {/* Контент текущей сцены (слои, кроме вынесенного аватара) */}
      <SceneRenderer
        scene={scene}
        sceneFrame={sceneFrame}
        width={width}
        height={height}
        videoStartFrame={sceneStartFrame}
        skipAvatarBg={!!(globalAvatarBg && sceneUsesAvatarBg)}
        skipAvatarOverlay={!!(globalAvatarOverlay && sceneUsesAvatarOverlay)}
      />

      {/* Единый непрерывный видео-аватар (overlay) — всегда смонтирован */}
      {globalAvatarOverlay && (
        <div
          style={{
            position: 'absolute',
            left: (globalAvatarOverlay.position.x / 100) * width,
            top: (globalAvatarOverlay.position.y / 100) * height,
            width: (globalAvatarOverlay.position.width / 100) * width,
            height: (globalAvatarOverlay.position.height / 100) * height,
            zIndex: 1,
            overflow: 'hidden',
            visibility: sceneUsesAvatarOverlay ? 'visible' : 'hidden',
          }}
        >
          <Video
            src={globalAvatarOverlay.url}
            style={{ width: '100%', height: '100%', objectFit: globalAvatarOverlay.objectFit }}
          />
        </div>
      )}

      {scene.audioUrl && (
        <Audio src={scene.audioUrl} />
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
  videoStartFrame?: number;
  skipAvatarBg?: boolean;
  skipAvatarOverlay?: boolean;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  sceneFrame,
  width,
  height,
  videoStartFrame = 0,
  skipAvatarBg = false,
  skipAvatarOverlay = false,
}) => {
  const { composition, layers } = scene;

  if (composition.mode === 'overlay') {
    const showBg = layers.background && layers.background.isVisible
      && !(skipAvatarBg && layers.background.contentType === 'avatar');

    const showOverlay = layers.overlay && layers.overlay.isVisible
      && !(skipAvatarOverlay && layers.overlay.contentType === 'avatar');

    return (
      <>
        {showBg && (
          <BackgroundLayerRenderer
            layer={layers.background!}
            sceneFrame={sceneFrame}
            width={width}
            height={height}
            videoStartFrame={videoStartFrame}
          />
        )}

        {showOverlay && (
          <OverlayLayerRenderer
            layer={layers.overlay!}
            sceneFrame={sceneFrame}
            width={width}
            height={height}
            videoStartFrame={videoStartFrame}
          />
        )}

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

  // Split режим — аватар рендерится per-scene (обрезан до split-области)
  if (composition.mode === 'split') {
    return (
      <SplitRenderer
        scene={scene}
        sceneFrame={sceneFrame}
        width={width}
        height={height}
        videoStartFrame={videoStartFrame}
      />
    );
  }

  return null;
};
