// ============================================================================
// SEGMENTATION PREPROCESS HOOK
// ============================================================================
// Предобработка видео: прогоняет кадры через MediaPipe до воспроизведения,
// сохраняет маски (Uint8Array alpha) в Map.
//
// Оптимизации:
//   - SKIP: обрабатывает каждый N-й кадр (маска меняется плавно)
//   - HALF_RES: сегментация на 50% разрешении (маска — мягкий градиент)
//   Итого: ~20x меньше памяти, ~10x быстрее обработка.

import { useState, useEffect, useRef, useCallback } from "react";

const FRAME_SKIP = 5;
const RESOLUTION_SCALE = 0.5;

export interface MaskCacheEntry {
  width: number;
  height: number;
  alpha: Uint8Array;
}

export interface MaskCacheMeta {
  cache: Map<number, MaskCacheEntry>;
  frameSkip: number;
}

export type MaskCache = MaskCacheMeta;

export interface SegmentationPreprocessResult {
  status: "idle" | "loading-model" | "processing" | "ready" | "error";
  progress: number;
  processedFrames: number;
  totalFrames: number;
  maskCache: MaskCache;
  error: string | null;
  retry: () => void;
}

interface PreprocessConfig {
  src: string | null;
  loadSrc?: string | null;
  fps: number;
  threshold: number;
  edgeBlur: number;
  enabled: boolean;
}

let segmenterPromise: Promise<any> | null = null;
let segmenterInstance: any = null;

async function getSegmenter(): Promise<any> {
  if (segmenterInstance) return segmenterInstance;
  if (segmenterPromise) return segmenterPromise;

  segmenterPromise = (async () => {
    const { ImageSegmenter, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );
    const vision = await FilesetResolver.forVisionTasks("/mediapipe");
    const segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/mediapipe/selfie_segmenter.tflite",
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
    segmenterInstance = segmenter;
    return segmenter;
  })();

  return segmenterPromise;
}

function buildAlphaMask(
  maskFloat: Float32Array,
  threshold: number,
  edgeBlur: number,
): Uint8Array {
  const alpha = new Uint8Array(maskFloat.length);
  const blurRange = edgeBlur * 0.5;
  const lo = threshold - blurRange;
  const hi = threshold + blurRange;
  const range = blurRange * 2 || 1;

  for (let i = 0; i < maskFloat.length; i++) {
    const c = maskFloat[i];
    if (c >= hi) {
      alpha[i] = 255;
    } else if (c <= lo) {
      alpha[i] = 0;
    } else {
      alpha[i] = ((c - lo) / range) * 255 + 0.5 | 0;
    }
  }
  return alpha;
}

const EMPTY_CACHE: MaskCache = { cache: new Map(), frameSkip: FRAME_SKIP };

export function useSegmentationPreprocess(
  config: PreprocessConfig,
): SegmentationPreprocessResult {
  const { src, loadSrc, fps, threshold, edgeBlur, enabled } = config;
  const effectiveSrc = loadSrc || src;

  const [status, setStatus] = useState<SegmentationPreprocessResult["status"]>("idle");
  const [progress, setProgress] = useState(0);
  const [processedFrames, setProcessedFrames] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  const maskCacheRef = useRef<MaskCache>(EMPTY_CACHE);
  const cancelledRef = useRef(false);

  const retry = useCallback(() => {
    maskCacheRef.current = { cache: new Map(), frameSkip: FRAME_SKIP };
    setRetryCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !effectiveSrc) {
      setStatus("idle");
      setProgress(0);
      setProcessedFrames(0);
      setTotalFrames(0);
      setError(null);
      maskCacheRef.current = { cache: new Map(), frameSkip: FRAME_SKIP };
      return;
    }

    cancelledRef.current = false;
    maskCacheRef.current = { cache: new Map(), frameSkip: FRAME_SKIP };

    const run = async () => {
      try {
        setStatus("loading-model");
        setError(null);
        setProgress(0);
        setProcessedFrames(0);

        const segmenter = await getSegmenter();
        if (cancelledRef.current) return;

        setStatus("processing");

        const videoUrl = effectiveSrc;
        const isSameOrigin = videoUrl.startsWith("/");

        const video = document.createElement("video");
        if (!isSameOrigin) {
          video.crossOrigin = "anonymous";
        }
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.src = videoUrl;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Не удалось загрузить видео"));
          setTimeout(() => reject(new Error("Таймаут загрузки видео")), 30000);
        });

        if (cancelledRef.current) return;

        const duration = video.duration;
        const totalVideoFrames = Math.ceil(duration * fps);
        const framesToProcess = Math.ceil(totalVideoFrames / FRAME_SKIP);
        setTotalFrames(framesToProcess);

        const segW = Math.round(video.videoWidth * RESOLUTION_SCALE);
        const segH = Math.round(video.videoHeight * RESOLUTION_SCALE);

        const canvas = document.createElement("canvas");
        canvas.width = segW;
        canvas.height = segH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        const seekToTime = (time: number): Promise<void> =>
          new Promise((resolve, reject) => {
            if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) {
              resolve();
              return;
            }
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              clearTimeout(timer);
              resolve();
            };
            const timer = setTimeout(() => {
              video.removeEventListener("seeked", onSeeked);
              if (video.readyState >= 2) resolve();
              else reject(new Error(`Seek timeout at ${time.toFixed(2)}s`));
            }, 5000);
            video.addEventListener("seeked", onSeeked);
            video.currentTime = time;
          });

        let processed = 0;
        for (let frameIdx = 0; frameIdx < totalVideoFrames; frameIdx += FRAME_SKIP) {
          if (cancelledRef.current) return;

          const time = frameIdx / fps;
          await seekToTime(time);
          if (cancelledRef.current) return;

          ctx.drawImage(video, 0, 0, segW, segH);
          const result = segmenter.segment(canvas);

          if (result?.confidenceMasks?.length > 0) {
            const maskData = result.confidenceMasks[0].getAsFloat32Array();
            const alpha = buildAlphaMask(maskData, threshold, edgeBlur);
            maskCacheRef.current.cache.set(frameIdx, {
              width: segW,
              height: segH,
              alpha,
            });
            result.close?.();
          }

          processed++;
          setProcessedFrames(processed);
          setProgress(processed / framesToProcess);

          if (processed % 3 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        video.src = "";
        video.load();

        if (!cancelledRef.current) {
          setStatus("ready");
          setProgress(1);
        }
      } catch (err) {
        if (!cancelledRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[SegmentationPreprocess] Error:", msg);
          setError(msg);
          setStatus("error");
        }
      }
    };

    run();
    return () => {
      cancelledRef.current = true;
    };
  }, [effectiveSrc, fps, threshold, edgeBlur, enabled, retryCounter]);

  return {
    status,
    progress,
    processedFrames,
    totalFrames,
    maskCache: maskCacheRef.current,
    error,
    retry,
  };
}
