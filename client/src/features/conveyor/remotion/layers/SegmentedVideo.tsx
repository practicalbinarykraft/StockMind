// ============================================================================
// SEGMENTED VIDEO (AI Background Removal)
// ============================================================================
// Удаляет фон из видео с помощью MediaPipe Selfie Segmenter.
// Работает покадрово через Canvas 2D.
// Совместим с Remotion (preview + SSR rendering в headless Chrome).

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  continueRender,
  delayRender,
} from "remotion";

export interface SegmentationConfig {
  enabled: boolean;
  threshold: number; // 0-1, минимальная уверенность для "человек"
  edgeBlur: number; // 0-1, размытие краёв маски
}

export const DEFAULT_SEGMENTATION: SegmentationConfig = {
  enabled: true,
  threshold: 0.5,
  edgeBlur: 0.15,
};

export interface SegmentedVideoProps {
  src: string;
  segmentation?: Partial<SegmentationConfig>;
  startFrom?: number;
  style?: React.CSSProperties;
  objectFit?: "contain" | "cover" | "fill";
}

type SegmenterType = {
  segment: (
    image: HTMLCanvasElement | HTMLVideoElement,
    callback: (result: {
      confidenceMasks?: Array<{ getAsFloat32Array: () => Float32Array; width: number; height: number }>;
      categoryMask?: { getAsUint8Array: () => Uint8Array; width: number; height: number };
    }) => void
  ) => void;
  setOptions: (options: { runningMode: string }) => Promise<void>;
};

// Глобальный singleton для сегментатора (один на всё приложение)
let segmenterPromise: Promise<SegmenterType> | null = null;
let segmenterInstance: SegmenterType | null = null;

async function getSegmenter(): Promise<SegmenterType> {
  if (segmenterInstance) return segmenterInstance;
  if (segmenterPromise) return segmenterPromise;

  segmenterPromise = (async () => {
    const { ImageSegmenter, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });

    segmenterInstance = segmenter as unknown as SegmenterType;
    return segmenterInstance;
  })();

  return segmenterPromise;
}

export const SegmentedVideo: React.FC<SegmentedVideoProps> = ({
  src,
  segmentation,
  startFrom = 0,
  style,
  objectFit = "contain",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastProcessedFrame = useRef<number>(-1);
  const renderHandle = useRef<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const segmenterRef = useRef<SegmenterType | null>(null);

  const config: SegmentationConfig = {
    ...DEFAULT_SEGMENTATION,
    ...segmentation,
  };

  useEffect(() => {
    let cancelled = false;
    getSegmenter()
      .then((s) => {
        if (!cancelled) {
          segmenterRef.current = s;
          setModelReady(true);
        }
      })
      .catch((err) => {
        console.error("[SegmentedVideo] Failed to load segmenter:", err);
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const segmenter = segmenterRef.current;
    if (!video || !canvas || !segmenter || video.readyState < 2) return;

    const w = video.videoWidth;
    const h = video.videoHeight;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }
    const offscreen = offscreenCanvasRef.current;
    if (offscreen.width !== w || offscreen.height !== h) {
      offscreen.width = w;
      offscreen.height = h;
    }

    const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!offCtx || !ctx) return;

    try {
      offCtx.drawImage(video, 0, 0, w, h);

      segmenter.segment(offscreen, (result) => {
        if (!result.confidenceMasks || result.confidenceMasks.length === 0) {
          ctx.drawImage(offscreen, 0, 0);
          return;
        }

        const mask = result.confidenceMasks[0];
        const maskData = mask.getAsFloat32Array();
        const imageData = offCtx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const threshold = config.threshold;
        const edgeBlur = config.edgeBlur;
        const blurRange = edgeBlur * 0.5;

        for (let i = 0; i < maskData.length; i++) {
          const confidence = maskData[i];

          let alpha: number;
          if (confidence >= threshold + blurRange) {
            alpha = 255;
          } else if (confidence <= threshold - blurRange) {
            alpha = 0;
          } else {
            const t = (confidence - (threshold - blurRange)) / (blurRange * 2);
            alpha = Math.round(t * 255);
          }

          data[i * 4 + 3] = alpha;
        }

        ctx.clearRect(0, 0, w, h);
        ctx.putImageData(imageData, 0, 0);
      });
    } catch (err) {
      console.error("[SegmentedVideo] Processing failed:", err);
      setHasError(true);
    }
  }, [config.threshold, config.edgeBlur]);

  const handleVideoError = useCallback(() => {
    console.error("[SegmentedVideo] Video failed to load:", src);
    setHasError(true);
    if (renderHandle.current !== null) {
      continueRender(renderHandle.current);
      renderHandle.current = null;
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError || !modelReady) return;

    const targetTime = (frame + startFrom) / fps;
    const currentFrame = frame + startFrom;

    if (lastProcessedFrame.current === currentFrame) return;

    const handle = delayRender(`SegmentedVideo frame ${currentFrame}`);
    renderHandle.current = handle;

    const onSeeked = () => {
      lastProcessedFrame.current = currentFrame;
      processFrame();
      if (renderHandle.current === handle) {
        continueRender(handle);
        renderHandle.current = null;
      }
    };

    if (
      Math.abs(video.currentTime - targetTime) < 0.01 &&
      video.readyState >= 2
    ) {
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
  }, [frame, fps, startFrom, processFrame, hasError, modelReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError || !modelReady) return;

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
  }, [src, processFrame, hasError, modelReady]);

  useEffect(() => {
    setHasError(false);
    lastProcessedFrame.current = -1;
  }, [src]);

  const isSameOrigin = src.startsWith("/");

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
        crossOrigin={isSameOrigin ? undefined : "anonymous"}
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
