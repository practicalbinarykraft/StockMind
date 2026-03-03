// ============================================================================
// SEGMENTED VIDEO (AI Background Removal)
// ============================================================================
// Удаляет фон из видео с помощью MediaPipe Selfie Segmenter.
//
// Два режима работы:
//   1. Предрассчитанный кэш масок (Preview) — маски уже готовы,
//      наложение занимает ~1мс. Нейросеть не вызывается.
//   2. Realtime-сегментация (SSR Rendering) — покадровый инференс
//      с delayRender для точного рендера.
//
// Аудио: воспроизводится через Remotion <Audio />.

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  continueRender,
  delayRender,
  Audio,
  Video,
  getRemotionEnvironment,
} from "remotion";
import type { MaskCache, MaskCacheEntry } from "../hooks/useSegmentationPreprocess";
import { useSegmentationCacheFor } from "../hooks/SegmentationCacheContext";

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
  volume?: number;
}

// Глобальный singleton — один сегментатор на приложение (только для SSR)
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
  volume = 1,
}) => {
  const maskCache = useSegmentationCacheFor(src);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isRendering = getRemotionEnvironment().isRendering;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastProcessedFrame = useRef<number>(-1);
  const renderHandle = useRef<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const segmenterRef = useRef<any>(null);

  const hasMaskCache = !!(maskCache && maskCache.cache.size > 0);

  const config: SegmentationConfig = {
    ...DEFAULT_SEGMENTATION,
    ...segmentation,
  };
  const thresholdRef = useRef(config.threshold);
  const edgeBlurRef = useRef(config.edgeBlur);
  thresholdRef.current = config.threshold;
  edgeBlurRef.current = config.edgeBlur;

  const targetRef = useRef({ frame: frame + startFrom, time: (frame + startFrom) / fps });
  targetRef.current = { frame: frame + startFrom, time: (frame + startFrom) / fps };

  // ── Загрузка модели (только для SSR, т.к. в preview используем кэш) ─────
  useEffect(() => {
    if (hasMaskCache) {
      setModelReady(true);
      return;
    }

    let handle: number | null = null;
    if (isRendering) {
      handle = delayRender("Loading segmentation model", {
        timeoutInMilliseconds: 30000,
      });
    }
    let cancelled = false;
    getSegmenter()
      .then((s) => {
        if (!cancelled) {
          segmenterRef.current = s;
          setModelReady(true);
          console.log("[SegmentedVideo] Segmenter ready");
        }
        if (handle !== null) continueRender(handle);
      })
      .catch((err) => {
        console.error("[SegmentedVideo] Failed to load segmenter:", err);
        if (!cancelled) {
          setHasError(true);
          segmenterPromise = null;
          loadAttempted = false;
        }
        if (handle !== null) continueRender(handle);
      });
    return () => {
      cancelled = true;
      if (handle !== null) continueRender(handle);
    };
  }, [isRendering, hasMaskCache]);

  // ── Наложение готовой маски из кэша (≈2-3мс) ────────────────────────────
  // 1. Находим ближайший обработанный кадр (skip factor)
  // 2. Рисуем маску на offscreen в её нативном разрешении (half-res)
  // 3. drawImage масштабирует маску до полного разрешения видео
  // 4. destination-in вырезает фон — без getImageData (CORS-safe)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const applyMaskFromCache = useCallback(
    (frameIdx: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !maskCache || video.readyState < 2) return false;

      const skip = maskCache.frameSkip;
      const nearestKey = Math.round(frameIdx / skip) * skip;
      let entry: MaskCacheEntry | undefined = maskCache.cache.get(nearestKey);
      if (!entry) {
        const below = Math.floor(frameIdx / skip) * skip;
        const above = Math.ceil(frameIdx / skip) * skip;
        entry = maskCache.cache.get(below) || maskCache.cache.get(above);
      }
      if (!entry) return false;

      const w = video.videoWidth;
      const h = video.videoHeight;
      const mw = entry.width;
      const mh = entry.height;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      // Offscreen для масштабирования маски до полного разрешения
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement("canvas");
      }
      const offscreen = offscreenCanvasRef.current;
      if (offscreen.width !== w || offscreen.height !== h) {
        offscreen.width = w;
        offscreen.height = h;
      }

      // Маленький canvas для записи маски в нативном (half) разрешении
      if (!maskCanvasRef.current) {
        maskCanvasRef.current = document.createElement("canvas");
      }
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas.width !== mw || maskCanvas.height !== mh) {
        maskCanvas.width = mw;
        maskCanvas.height = mh;
      }

      const maskCtx = maskCanvas.getContext("2d")!;
      const offCtx = offscreen.getContext("2d")!;
      const ctx = canvas.getContext("2d")!;

      // Записываем маску (белый + альфа) в half-res canvas
      const maskImageData = new ImageData(mw, mh);
      const md = maskImageData.data;
      const alpha = entry.alpha;
      for (let i = 0; i < alpha.length; i++) {
        const off = i * 4;
        md[off] = 255;
        md[off + 1] = 255;
        md[off + 2] = 255;
        md[off + 3] = alpha[i];
      }
      maskCtx.putImageData(maskImageData, 0, 0);

      // Масштабируем маску до полного разрешения (билинейная интерполяция)
      offCtx.clearRect(0, 0, w, h);
      offCtx.drawImage(maskCanvas, 0, 0, w, h);

      // Рисуем видеокадр → маскируем через destination-in
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(video, 0, 0, w, h);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(offscreen, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      return true;
    },
    [maskCache],
  );

  // ── Realtime-обработка (только SSR, без кэша) ──────────────────────────
  const processFrameRealtime = useCallback(() => {
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

      result.close?.();

      return true;
    } catch (err) {
      console.error("[SegmentedVideo] Frame processing error:", err);
      setHasError(true);
      return false;
    }
  }, []);

  const processFrame = useCallback(
    (frameIdx: number) => {
      if (hasMaskCache) return applyMaskFromCache(frameIdx);
      return processFrameRealtime();
    },
    [hasMaskCache, applyMaskFromCache, processFrameRealtime],
  );

  const handleVideoError = useCallback(() => {
    console.error("[SegmentedVideo] Video failed to load:", src);
    setHasError(true);
    if (renderHandle.current !== null) {
      continueRender(renderHandle.current);
      renderHandle.current = null;
    }
  }, [src]);

  // ── RENDERING MODE: покадровая обработка с delayRender ────────────────────
  useEffect(() => {
    if (!isRendering) return;
    const video = videoRef.current;
    if (!video || hasError || !modelReady) return;

    const currentFrame = frame + startFrom;
    const targetTime = currentFrame / fps;

    if (lastProcessedFrame.current === currentFrame) return;

    const handle = delayRender(`SegmentedVideo frame ${currentFrame}`, {
      timeoutInMilliseconds: 8000,
    });
    renderHandle.current = handle;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (renderHandle.current === handle) {
        continueRender(handle);
        renderHandle.current = null;
      }
    };

    const doProcess = () => {
      clearTimeout(seekTimer);
      lastProcessedFrame.current = currentFrame;
      processFrame(currentFrame);
      settle();
    };

    let seekTimer: ReturnType<typeof setTimeout> | undefined;

    if (
      Math.abs(video.currentTime - targetTime) < 0.01 &&
      video.readyState >= 2
    ) {
      doProcess();
    } else {
      seekTimer = setTimeout(() => {
        video.removeEventListener("seeked", doProcess);
        if (video.readyState >= 2) {
          lastProcessedFrame.current = currentFrame;
          processFrame(currentFrame);
        }
        settle();
      }, 3000);

      video.addEventListener("seeked", doProcess, { once: true });
      video.currentTime = targetTime;
    }

    return () => {
      clearTimeout(seekTimer);
      video.removeEventListener("seeked", doProcess);
      settle();
    };
  }, [frame, fps, startFrom, processFrame, hasError, modelReady, isRendering]);

  // ── PREVIEW MODE: постоянный seeked-обработчик ────────────────────────────
  useEffect(() => {
    if (isRendering || hasError || !modelReady) return;
    const video = videoRef.current;
    if (!video) return;

    const onSeeked = () => {
      const { frame: tgtFrame } = targetRef.current;
      if (lastProcessedFrame.current !== tgtFrame && video.readyState >= 2) {
        lastProcessedFrame.current = tgtFrame;
        processFrame(tgtFrame);
      }
      const latest = targetRef.current;
      if (latest.frame !== tgtFrame && Math.abs(video.currentTime - latest.time) >= 0.01) {
        video.currentTime = latest.time;
      }
    };

    video.addEventListener("seeked", onSeeked);
    return () => video.removeEventListener("seeked", onSeeked);
  }, [isRendering, hasError, modelReady, processFrame, fps]);

  // ── PREVIEW MODE: синхронизация позиции видео с Remotion-кадром ───────────
  useEffect(() => {
    if (isRendering || hasError || !modelReady) return;
    const video = videoRef.current;
    if (!video) return;

    const currentFrame = frame + startFrom;
    const targetTime = currentFrame / fps;

    if (lastProcessedFrame.current === currentFrame) return;

    if (
      Math.abs(video.currentTime - targetTime) < 0.01 &&
      video.readyState >= 2
    ) {
      lastProcessedFrame.current = currentFrame;
      processFrame(currentFrame);
    } else if (video.readyState >= 2) {
      video.currentTime = targetTime;
    }
  }, [frame, startFrom, fps, isRendering, hasError, modelReady, processFrame]);

  // ── Первичная обработка при загрузке видео ────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError || !modelReady) return;

    const onLoaded = () => {
      const currentFrame = frame + startFrom;
      processFrame(currentFrame);
    };

    if (video.readyState >= 2) {
      onLoaded();
    } else {
      video.addEventListener("loadeddata", onLoaded, { once: true });
    }

    return () => {
      video.removeEventListener("loadeddata", onLoaded);
    };
  }, [src, processFrame, hasError, modelReady, frame, startFrom]);

  // ── Сброс при смене src ───────────────────────────────────────────────────
  useEffect(() => {
    setHasError(false);
    lastProcessedFrame.current = -1;
  }, [src]);

  const isSameOrigin = src.startsWith("/");
  // С кэшем масок не нужен CORS — используем composition mode (destination-in),
  // который не требует чтения пикселей (canvas может быть tainted).
  // Без кэша (SSR) — нужен CORS для getImageData в realtime-сегментации.
  const needsCrossOrigin = !hasMaskCache && !isSameOrigin;

  const canvasStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit,
    ...style,
  };

  if (hasError) {
    return (
      <Video
        src={src}
        startFrom={startFrom}
        volume={volume}
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
      <Audio src={src} startFrom={startFrom} volume={volume} />
      <video
        ref={videoRef}
        src={src}
        crossOrigin={needsCrossOrigin ? "anonymous" : undefined}
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
