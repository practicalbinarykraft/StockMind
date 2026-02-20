// ============================================================================
// OVERLAY LAYER RENDERER
// ============================================================================
// Компонент для рендеринга overlay слоя с позиционированием

import React from "react";
import { Img, OffthreadVideo, Sequence, useVideoConfig } from "remotion";
import type { OverlayLayer } from "../../types/layers";

export interface OverlayLayerRendererProps {
  layer: OverlayLayer;
  sceneFrame: number;
  width: number;
  height: number;
  videoStartFrame?: number;
}

export const OverlayLayerRenderer: React.FC<OverlayLayerRendererProps> = ({
  layer,
  sceneFrame,
  width,
  height,
  videoStartFrame = 0,
}) => {
  const { fps } = useVideoConfig();

  if (!layer.sourceUrl) return null;

  const fit = layer.objectFit || "contain";
  const videoContentOffset = Math.round((layer.metadata?.videoStartTime || 0) * fps);

  // Конвертируем процентные позиции в пиксели
  const pixelPosition = {
    x: (layer.position.x / 100) * width,
    y: (layer.position.y / 100) * height,
    width: (layer.position.width / 100) * width,
    height: (layer.position.height / 100) * height,
  };

  return (
    <div
      style={{
        position: "absolute",
        left: pixelPosition.x,
        top: pixelPosition.y,
        width: pixelPosition.width,
        height: pixelPosition.height,
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {layer.contentType === "image" && (
        <Img
          src={layer.sourceUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
          }}
        />
      )}

      {layer.contentType === "video" && (
        <Sequence from={videoStartFrame} layout="none">
          <OffthreadVideo
            src={layer.sourceUrl}
            startFrom={videoContentOffset}
            style={{
              width: "100%",
              height: "100%",
              objectFit: fit,
            }}
          />
        </Sequence>
      )}

      {layer.contentType === "avatar" && (
        <OffthreadVideo
          src={layer.sourceUrl}
          startFrom={videoStartFrame}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
          }}
        />
      )}
    </div>
  );
};
