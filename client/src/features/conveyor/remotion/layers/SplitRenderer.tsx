// ============================================================================
// SPLIT RENDERER
// ============================================================================
// Компонент для рендеринга split режима (разделение canvas)

import React from "react";
import { Img, Video } from "remotion";
import type {
  EnhancedScene,
  BackgroundLayer,
  OverlayLayer,
  ChromaKeySettings,
} from "../../types/layers";
import { TextLayerRenderer } from "./TextLayerRenderer";
import { ChromaKeyVideo } from "./ChromaKeyVideo";

export interface SplitRendererProps {
  scene: EnhancedScene;
  sceneFrame: number;
  width: number;
  height: number;
  videoStartFrame?: number;
}

interface SplitPartRendererProps {
  layer: BackgroundLayer | OverlayLayer;
  sceneFrame: number;
  width: number;
  height: number;
  videoStartFrame?: number;
}

// ============================================================================
// SPLIT PART RENDERER
// ============================================================================

const SplitPartRenderer: React.FC<SplitPartRendererProps> = ({
  layer,
  sceneFrame,
  width,
  height,
  videoStartFrame = 0,
}) => {
  if (!layer.sourceUrl) return null;

  return (
    <>
      {layer.contentType === "image" && (
        <Img
          src={layer.sourceUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        />
      )}

      {layer.contentType === "video" && (
        <Video
          src={layer.sourceUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        />
      )}

      {layer.contentType === "avatar" && (() => {
        const chromaKey = (layer as any).metadata?.chromaKey as ChromaKeySettings | undefined;
        if (chromaKey?.enabled) {
          return (
            <ChromaKeyVideo
              src={layer.sourceUrl!}
              startFrom={videoStartFrame}
              objectFit="contain"
              chromaKey={{
                enabled: true,
                keyColor: chromaKey.keyColor,
                similarity: chromaKey.similarity,
                smoothness: chromaKey.smoothness,
              }}
            />
          );
        }
        return (
          <Video
            src={layer.sourceUrl!}
            startFrom={videoStartFrame}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(0)",
            }}
          />
        );
      })()}
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SplitRenderer: React.FC<SplitRendererProps> = ({
  scene,
  sceneFrame,
  width,
  height,
  videoStartFrame = 0,
}) => {
  const { composition, layers } = scene;
  const { splitRatio, splitDirection, splitOrder } = composition;

  // Вычисляем размеры для каждой части
  const isHorizontal = splitDirection === "horizontal";
  const firstSize = isHorizontal ? width * splitRatio : height * splitRatio;
  const secondSize = isHorizontal
    ? width * (1 - splitRatio)
    : height * (1 - splitRatio);

  // Определяем какой слой идет первым
  const firstLayer =
    splitOrder === "background-first" ? layers.background : layers.overlay;
  const secondLayer =
    splitOrder === "background-first" ? layers.overlay : layers.background;

  return (
    <>
      {/* Первая часть split */}
      {firstLayer && firstLayer.isVisible && (
        <div
          style={{
            position: "absolute",
            ...(isHorizontal
              ? { left: 0, top: 0, width: firstSize, height }
              : { left: 0, top: 0, width, height: firstSize }),
            overflow: "hidden",
          }}
        >
          <SplitPartRenderer
            layer={firstLayer}
            sceneFrame={sceneFrame}
            width={isHorizontal ? firstSize : width}
            height={isHorizontal ? height : firstSize}
            videoStartFrame={videoStartFrame}
          />
        </div>
      )}

      {/* Вторая часть split */}
      {secondLayer && secondLayer.isVisible && (
        <div
          style={{
            position: "absolute",
            ...(isHorizontal
              ? { left: firstSize, top: 0, width: secondSize, height }
              : { left: 0, top: firstSize, width, height: secondSize }),
            overflow: "hidden",
          }}
        >
          <SplitPartRenderer
            layer={secondLayer}
            sceneFrame={sceneFrame}
            width={isHorizontal ? secondSize : width}
            height={isHorizontal ? height : secondSize}
            videoStartFrame={videoStartFrame}
          />
        </div>
      )}

      {/* Text слой поверх всего (z-index: 2) */}
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
};
