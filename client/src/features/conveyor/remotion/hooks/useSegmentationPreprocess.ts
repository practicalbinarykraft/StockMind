// ============================================================================
// SEGMENTATION PREPROCESS HOOK
// ============================================================================
// Предобработка видео: прогоняет все кадры через MediaPipe до воспроизведения,
// сохраняет маски (Uint8Array alpha) в Map. При воспроизведении SegmentedVideo
// просто накладывает готовую маску (~1мс вместо 50-200мс realtime-инференса).

import { useState, useEffect, useRef, useCallback } from "react";

export interface MaskCacheEntry {
  width: number;
  height: number;
  alpha: Uint8Array;
}

export type MaskCache = Map<number, MaskCacheEntry>;

export interface SegmentationPreprocessResult {
  status: "idle" | "loading-model" | "processing" | "ready" | "error";
  progress: number; // 0..1
  processedFrames: number;
  totalFrames: number;
  maskCache: MaskCache;
  error: string | null;
  retry: () => void;
}

interface PreprocessConfig {
  src: string | null;
  /** URL для реальной загрузки видео (прокси). Если не указан — используется src. */
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

  const maskCacheRef = useRef<MaskCache>(new Map());
  const cancelledRef = useRef(false);

  const retry = useCallback(() => {
    maskCacheRef.current = new Map();
    setRetryCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !effectiveSrc) {
      setStatus("idle");
      setProgress(0);
      setProcessedFrames(0);
      setTotalFrames(0);
      setError(null);
      maskCacheRef.current = new Map();
      return;
    }

    cancelledRef.current = false;
    maskCacheRef.current = new Map();

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
        if (isSameOrigin) {
          // Same-origin прокси — crossOrigin не нужен, canvas не будет tainted
        } else {
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
        const numFrames = Math.ceil(duration * fps);
        setTotalFrames(numFrames);

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        const seekToFrame = (frameIdx: number): Promise<void> =>
          new Promise((resolve, reject) => {
            const time = frameIdx / fps;
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
              else reject(new Error(`Seek timeout frame ${frameIdx}`));
            }, 5000);
            video.addEventListener("seeked", onSeeked);
            video.currentTime = time;
          });

        for (let i = 0; i < numFrames; i++) {
          if (cancelledRef.current) return;

          await seekToFrame(i);
          if (cancelledRef.current) return;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const result = segmenter.segment(canvas);

          if (result?.confidenceMasks?.length > 0) {
            const maskData = result.confidenceMasks[0].getAsFloat32Array();
            const alpha = buildAlphaMask(maskData, threshold, edgeBlur);
            maskCacheRef.current.set(i, {
              width: canvas.width,
              height: canvas.height,
              alpha,
            });
            result.close?.();
          }

          const done = i + 1;
          setProcessedFrames(done);
          setProgress(done / numFrames);

          // Даём UI обновиться — без этого браузер может "зависнуть" на длинных видео
          if (done % 5 === 0) {
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
