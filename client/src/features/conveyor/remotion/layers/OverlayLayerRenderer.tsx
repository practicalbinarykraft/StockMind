// ============================================================================
// OVERLAY LAYER RENDERER
// ============================================================================
// Компонент для рендеринга overlay слоя с позиционированием

import React from "react";
import { Img, OffthreadVideo } from "remotion";
import type { OverlayLayer } from "../../types/layers";

export interface OverlayLayerRendererProps {
  layer: OverlayLayer;
  sceneFrame: number;
  width: number;
  height: number;
}

export const OverlayLayerRenderer: React.FC<OverlayLayerRendererProps> = ({
  layer,
  sceneFrame,
  width,
  height,
}) => {
  if (!layer.sourceUrl) return null;

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
      }}
    >
      {layer.contentType === "image" && (
        <Img
          src={layer.sourceUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}

      {(layer.contentType === "video" || layer.contentType === "avatar") && (
        <OffthreadVideo
          src={layer.sourceUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
};
