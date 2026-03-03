// ============================================================================
// BACKGROUND LAYER RENDERER
// ============================================================================
// Компонент для рендеринга фонового слоя (image/video/avatar)
// Поддерживает ChromaKey для удаления фона у видео и аватаров

import React from "react";
import { AbsoluteFill, Img, Video, Sequence, useVideoConfig } from "remotion";
import type { BackgroundLayer, ChromaKeySettings } from "../../types/layers";
import { getLayerStreamUrl } from "../../types/layers";
import { ChromaKeyVideo } from "./ChromaKeyVideo";

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
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        />
      )}

      {layer.contentType === "video" && (() => {
        const chromaKey = layer.metadata?.chromaKey as ChromaKeySettings | undefined;
        if (chromaKey?.enabled) {
          const streamSrc = getLayerStreamUrl(layer.scriptId, layer.id);
          return (
            <Sequence from={videoStartFrame} layout="none">
              <ChromaKeyVideo
                src={streamSrc}
                startFrom={videoContentOffset}
                objectFit="cover"
                chromaKey={{
                  enabled: true,
                  keyColor: chromaKey.keyColor,
                  similarity: chromaKey.similarity,
                  smoothness: chromaKey.smoothness,
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
        const chromaKey = layer.metadata?.chromaKey as ChromaKeySettings | undefined;
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
    </AbsoluteFill>
  );
};
