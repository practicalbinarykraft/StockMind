// ============================================================================
// CHROMA KEY VIDEO
// ============================================================================
// Компонент для рендеринга видео с удалением зелёного (или другого) фона.
// Использует Canvas 2D API для попиксельной обработки каждого кадра.
// Совместим с Remotion (preview + SSR rendering в headless Chrome).

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  continueRender,
  delayRender,
} from "remotion";

export interface ChromaKeyConfig {
  enabled: boolean;
  keyColor: [number, number, number]; // RGB [0-255]
  similarity: number; // 0-1, how close to key color to remove
  smoothness: number; // 0-1, edge softness
}

export const DEFAULT_CHROMA_KEY: ChromaKeyConfig = {
  enabled: true,
  keyColor: [0, 255, 0],
  similarity: 0.35,
  smoothness: 0.12,
};

export interface ChromaKeyVideoProps {
  src: string;
  chromaKey?: Partial<ChromaKeyConfig>;
  startFrom?: number;
  style?: React.CSSProperties;
  objectFit?: "contain" | "cover" | "fill";
}

export const ChromaKeyVideo: React.FC<ChromaKeyVideoProps> = ({
  src,
  chromaKey,
  startFrom = 0,
  style,
  objectFit = "contain",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastProcessedFrame = useRef<number>(-1);
  const renderHandle = useRef<number | null>(null);
  const [hasError, setHasError] = useState(false);

  const config: ChromaKeyConfig = {
    ...DEFAULT_CHROMA_KEY,
    ...chromaKey,
  };

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const [keyR, keyG, keyB] = config.keyColor;
      const maxDist = Math.sqrt(255 * 255 * 3);
      const simThreshold = config.similarity * maxDist;
      const smoothRange = config.smoothness * maxDist;

      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - keyR;
        const dg = data[i + 1] - keyG;
        const db = data[i + 2] - keyB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist < simThreshold) {
          data[i + 3] = 0;
        } else if (dist < simThreshold + smoothRange) {
          const alpha = (dist - simThreshold) / smoothRange;
          data[i + 3] = Math.round(alpha * 255);
        }
      }

      ctx.putImageData(imageData, 0, 0);
    } catch (err) {
      console.error("[ChromaKeyVideo] Canvas processing failed (possibly CORS):", err);
      setHasError(true);
    }
  }, [config.keyColor, config.similarity, config.smoothness]);

  const handleVideoError = useCallback(() => {
    console.error("[ChromaKeyVideo] Video failed to load:", src);
    setHasError(true);
    if (renderHandle.current !== null) {
      continueRender(renderHandle.current);
      renderHandle.current = null;
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    const targetTime = (frame + startFrom) / fps;
    const currentFrame = frame + startFrom;

    if (lastProcessedFrame.current === currentFrame) return;

    const handle = delayRender(`ChromaKeyVideo frame ${currentFrame}`);
    renderHandle.current = handle;

    const onSeeked = () => {
      lastProcessedFrame.current = currentFrame;
      processFrame();
      if (renderHandle.current === handle) {
        continueRender(handle);
        renderHandle.current = null;
      }
    };

    if (Math.abs(video.currentTime - targetTime) < 0.01 && video.readyState >= 2) {
      lastProcessedFrame.current = currentFrame;
      processFrame();
      continueRender(handle);
      renderHandle.current = null;
    } else {
      video.addEventListener("seeked", onSeeked, { once: true });
      video.currentTime = targetTime;
    }

    return () => {
      video.removeEventListener("seeked", onSeeked);
      if (renderHandle.current !== null) {
        continueRender(renderHandle.current);
        renderHandle.current = null;
      }
    };
  }, [frame, fps, startFrom, processFrame, hasError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    const onLoaded = () => {
      processFrame();
    };

    if (video.readyState >= 2) {
      onLoaded();
    } else {
      video.addEventListener("loadeddata", onLoaded, { once: true });
    }

    return () => {
      video.removeEventListener("loadeddata", onLoaded);
    };
  }, [src, processFrame, hasError]);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
    lastProcessedFrame.current = -1;
  }, [src]);

  const canvasStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit,
    ...style,
  };

  if (hasError) {
    return (
      <video
        src={src}
        muted
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit,
          ...style,
        }}
      />
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        crossOrigin="anonymous"
        preload="auto"
        muted
        playsInline
        onError={handleVideoError}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <canvas ref={canvasRef} style={canvasStyle} />
    </>
  );
};
