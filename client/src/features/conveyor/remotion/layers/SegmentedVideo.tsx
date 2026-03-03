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
  threshold: number;
  edgeBlur: number;
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

// Глобальный singleton — один сегментатор на приложение
let segmenterPromise: Promise<any> | null = null;
let segmenterInstance: any = null;
let loadAttempted = false;

async function getSegmenter(): Promise<any> {
  if (segmenterInstance) return segmenterInstance;
  if (segmenterPromise) return segmenterPromise;

  loadAttempted = true;

  segmenterPromise = (async () => {
    const { ImageSegmenter, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );

    const wasmPath = "/mediapipe";
    const modelPath = "/mediapipe/selfie_segmenter.tflite";

    console.log("[SegmentedVideo] Loading MediaPipe WASM from:", wasmPath);

    const vision = await FilesetResolver.forVisionTasks(wasmPath);

    const segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: { modelAssetPath: modelPath, delegate: "CPU" },
      runningMode: "IMAGE",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
    console.log("[SegmentedVideo] Model loaded (CPU)");

    segmenterInstance = segmenter;
    return segmenter;
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
  const segmenterRef = useRef<any>(null);

  const config: SegmentationConfig = {
    ...DEFAULT_SEGMENTATION,
    ...segmentation,
  };
  const thresholdRef = useRef(config.threshold);
  const edgeBlurRef = useRef(config.edgeBlur);
  thresholdRef.current = config.threshold;
  edgeBlurRef.current = config.edgeBlur;

  useEffect(() => {
    let cancelled = false;
    getSegmenter()
      .then((s) => {
        if (!cancelled) {
          segmenterRef.current = s;
          setModelReady(true);
          console.log("[SegmentedVideo] Segmenter ready");
        }
      })
      .catch((err) => {
        console.error("[SegmentedVideo] Failed to load segmenter:", err);
        if (!cancelled) {
          setHasError(true);
          // Сбрасываем промис, чтобы можно было повторить загрузку
          segmenterPromise = null;
          loadAttempted = false;
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const segmenter = segmenterRef.current;
    if (!video || !canvas || !segmenter || video.readyState < 2) return false;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) return false;

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
    if (!offCtx || !ctx) return false;

    try {
      offCtx.drawImage(video, 0, 0, w, h);

      // Синхронный вызов — результат возвращается сразу
      const result = segmenter.segment(offscreen);

      if (!result || !result.confidenceMasks || result.confidenceMasks.length === 0) {
        console.warn("[SegmentedVideo] No confidence masks returned");
        ctx.drawImage(offscreen, 0, 0);
        return true;
      }

      const mask = result.confidenceMasks[0];
      const maskData = mask.getAsFloat32Array();
      const imageData = offCtx.getImageData(0, 0, w, h);
      const data = imageData.data;

      const threshold = thresholdRef.current;
      const edgeBlur = edgeBlurRef.current;
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

      // Закрываем ресурсы MediaPipe (маски)
      result.close?.();

      return true;
    } catch (err) {
      console.error("[SegmentedVideo] Frame processing error:", err);
      setHasError(true);
      return false;
    }
  }, []);

  const handleVideoError = useCallback(() => {
    console.error("[SegmentedVideo] Video failed to load:", src);
    setHasError(true);
    if (renderHandle.current !== null) {
      continueRender(renderHandle.current);
      renderHandle.current = null;
    }
  }, [src]);

  // Основной эффект: seek + process каждого кадра Remotion
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError || !modelReady) return;

    const targetTime = (frame + startFrom) / fps;
    const currentFrame = frame + startFrom;

    if (lastProcessedFrame.current === currentFrame) return;

    const handle = delayRender(`SegmentedVideo frame ${currentFrame}`);
    renderHandle.current = handle;

    const doProcess = () => {
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
      doProcess();
    } else {
      video.addEventListener("seeked", doProcess, { once: true });
      video.currentTime = targetTime;
    }

    return () => {
      video.removeEventListener("seeked", doProcess);
      if (renderHandle.current !== null) {
        continueRender(renderHandle.current);
        renderHandle.current = null;
      }
    };
  }, [frame, fps, startFrom, processFrame, hasError, modelReady]);

  // Первичная обработка при загрузке видео
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

  // Сброс при смене src
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
