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
  BackgroundRemovalSettings,
} from "../../types/layers";
import { getLayerStreamUrl, getProcessedVideoUrl } from "../../types/layers";
import { TextLayerRenderer } from "./TextLayerRenderer";
import { SegmentedVideo } from "./SegmentedVideo";
import { useProcessedVideoUrl } from "../hooks/ProcessedVideoContext";

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

  const bgRemoval = (layer as any).metadata?.bgRemoval as BackgroundRemovalSettings | undefined;
  const processedFromContext = useProcessedVideoUrl(layer.id);
  const processedVideoKey = ((layer as any).metadata?.bgRemoval as any)?.processedVideoKey;
  const processedSrc = processedFromContext
    || (processedVideoKey ? getProcessedVideoUrl((layer as any).scriptId, layer.id) : undefined);

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

      {layer.contentType === "video" && (() => {
        if (bgRemoval?.enabled) {
          const streamSrc = getLayerStreamUrl((layer as any).scriptId, layer.id);
          return (
            <SegmentedVideo
              src={streamSrc}
              processedSrc={processedSrc}
              startFrom={videoStartFrame}
              objectFit="cover"
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
        );
      })()}

      {layer.contentType === "avatar" && (() => {
        if (bgRemoval?.enabled) {
          return (
            <SegmentedVideo
              src={layer.sourceUrl!}
              processedSrc={processedSrc}
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

  const isHorizontal = splitDirection === "horizontal";
  const firstSize = isHorizontal ? width * splitRatio : height * splitRatio;
  const secondSize = isHorizontal
    ? width * (1 - splitRatio)
    : height * (1 - splitRatio);

  const firstLayer =
    splitOrder === "background-first" ? layers.background : layers.overlay;
  const secondLayer =
    splitOrder === "background-first" ? layers.overlay : layers.background;

  return (
    <>
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
