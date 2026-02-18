// ============================================================================
// BACKGROUND LAYER RENDERER
// ============================================================================
// Компонент для рендеринга фонового слоя (image/video/avatar)

import React from "react";
import { AbsoluteFill, Img, OffthreadVideo } from "remotion";
import type { BackgroundLayer } from "../../types/layers";

export interface BackgroundLayerRendererProps {
  layer: BackgroundLayer;
  sceneFrame: number;
  width: number;
  height: number;
  videoStartFrame?: number;
}

export const BackgroundLayerRenderer: React.FC<
  BackgroundLayerRendererProps
> = ({ layer, sceneFrame, width, height, videoStartFrame = 0 }) => {
  if (!layer.sourceUrl) return null;

  return (
    <AbsoluteFill>
      {layer.contentType === "image" && (
        <Img
          src={layer.sourceUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {(layer.contentType === "video" || layer.contentType === "avatar") && (
        <OffthreadVideo
          src={layer.sourceUrl}
          startFrom={layer.contentType === "avatar" ? videoStartFrame : 0}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
