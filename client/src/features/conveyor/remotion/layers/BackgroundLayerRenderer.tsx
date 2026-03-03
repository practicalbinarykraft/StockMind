// ============================================================================
// BACKGROUND LAYER RENDERER
// ============================================================================
// Компонент для рендеринга фонового слоя (image/video/avatar)
// Поддерживает AI-сегментацию для удаления фона у видео и аватаров

import React from "react";
import { AbsoluteFill, Img, Video, Sequence, useVideoConfig } from "remotion";
import type { BackgroundLayer, BackgroundRemovalSettings } from "../../types/layers";
import { getLayerStreamUrl } from "../../types/layers";
import { SegmentedVideo } from "./SegmentedVideo";

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
  const bgRemoval = layer.metadata?.bgRemoval as BackgroundRemovalSettings | undefined;

  return (
    <AbsoluteFill>
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

      {layer.contentType === "video" && (() => {
        if (bgRemoval?.enabled) {
          const streamSrc = getLayerStreamUrl(layer.scriptId, layer.id);
          return (
            <Sequence from={videoStartFrame} layout="none">
              <SegmentedVideo
                src={streamSrc}
                startFrom={videoContentOffset}
                objectFit="cover"
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
                objectFit: "cover",
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
              objectFit="contain"
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
              objectFit: "contain",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(0)",
            }}
          />
        );
      })()}
    </AbsoluteFill>
  );
};
