// ============================================================================
// OVERLAY LAYER RENDERER
// ============================================================================
// Компонент для рендеринга overlay слоя с позиционированием
// Поддерживает AI-сегментацию для удаления фона у видео и аватаров

import React from "react";
import { Img, Video, Sequence, useVideoConfig } from "remotion";
import type { OverlayLayer, BackgroundRemovalSettings } from "../../types/layers";
import { getLayerStreamUrl } from "../../types/layers";
import { SegmentedVideo } from "./SegmentedVideo";

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

  const pixelPosition = {
    x: (layer.position.x / 100) * width,
    y: (layer.position.y / 100) * height,
    width: (layer.position.width / 100) * width,
    height: (layer.position.height / 100) * height,
  };

  const bgRemoval = layer.metadata?.bgRemoval as BackgroundRemovalSettings | undefined;

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
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        />
      )}

      {layer.contentType === "video" && (() => {
        if (bgRemoval?.enabled) {
          const streamSrc = getLayerStreamUrl(layer.scriptId, layer.id);
          return (
            <Sequence from={videoStartFrame} layout="none">
              <SegmentedVideo
                src={streamSrc}
                startFrom={videoContentOffset}
                objectFit={fit}
                segmentation={{
                  enabled: true,
                  threshold: bgRemoval.threshold,
                  edgeBlur: bgRemoval.edgeBlur,
                }}
              />
            </Sequence>
          );
        }
        return (
          <Sequence from={videoStartFrame} layout="none">
            <Video
              src={layer.sourceUrl}
              startFrom={videoContentOffset}
              style={{
                width: "100%",
                height: "100%",
                objectFit: fit,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
            />
          </Sequence>
        );
      })()}

      {layer.contentType === "avatar" && (() => {
        if (bgRemoval?.enabled) {
          return (
            <SegmentedVideo
              src={layer.sourceUrl!}
              startFrom={videoStartFrame}
              objectFit={fit}
              segmentation={{
                enabled: true,
                threshold: bgRemoval.threshold,
                edgeBlur: bgRemoval.edgeBlur,
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
              objectFit: fit,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(0)",
            }}
          />
        );
      })()}
    </div>
  );
};
