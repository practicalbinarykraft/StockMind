// ============================================================================
// BACKGROUND LAYER RENDERER
// ============================================================================
// Компонент для рендеринга фонового слоя (image/video/avatar)

import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, useVideoConfig } from "remotion";
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
  const { fps } = useVideoConfig();

  if (!layer.sourceUrl) return null;

  const videoContentOffset = Math.round((layer.metadata?.videoStartTime || 0) * fps);

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

      {layer.contentType === "video" && (
        <Sequence from={videoStartFrame} layout="none">
          <OffthreadVideo
            src={layer.sourceUrl}
            startFrom={videoContentOffset}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
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
            objectFit: "contain",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
