import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";
import { logger } from "../../lib/logger";
import { StorageRepo } from "../storage/storage.repo";
import { backgroundLayersRepo } from "../scene-layers/background-layers.repo";
import { overlayLayersRepo } from "../scene-layers/overlay-layers.repo";
import { sceneLayersRepo } from "../scene-layers/scene-layers.repo";

const storageRepo = new StorageRepo();

const BG_REMOVAL_FPS = 20;
const BG_REMOVAL_CONCURRENCY = 2;
const BG_REMOVAL_MAX_HEIGHT = 720;

export interface ProcessingJob {
  status: "pending" | "processing" | "encoding" | "ready" | "failed";
  progress: number;
  processedFrames: number;
  totalFrames: number;
  error?: string;
  processedVideoKey?: string;
}

const jobs = new Map<string, ProcessingJob>();

function jobKey(layerId: string): string {
  return `bg-removal-${layerId}`;
}

function getVideoInfo(
  inputPath: string,
): Promise<{ duration: number; fps: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video",
      );
      if (!videoStream) return reject(new Error("No video stream found"));

      const duration = metadata.format.duration || 0;
      const fpsStr = videoStream.r_frame_rate || "30/1";
      const [num, den] = fpsStr.split("/").map(Number);
      const fps = den ? num / den : 30;

      resolve({
        duration,
        fps: Math.min(fps, BG_REMOVAL_FPS),
        width: videoStream.width || 1920,
        height: videoStream.height || 1080,
      });
    });
  });
}

function extractFrames(
  inputPath: string,
  outputDir: string,
  fps: number,
  maxHeight: number,
): Promise<void> {
  const scaleFilter = `scale=-2:'min(${maxHeight},ih)'`;
  const vf = `fps=${fps},${scaleFilter}`;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(["-vf", vf])
      .output(path.join(outputDir, "frame-%06d.png"))
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

function encodeWebmAlpha(
  inputPattern: string,
  originalVideoPath: string,
  outputPath: string,
  fps: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPattern)
      .inputOptions(["-framerate", `${fps}`])
      .input(originalVideoPath)
      .outputOptions([
        "-map",
        "0:v",
        "-map",
        "1:a?",
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        "-b:v",
        "2M",
        "-auto-alt-ref",
        "0",
        "-deadline",
        "good",
        "-speed",
        "4",
        "-row-mt",
        "1",
        "-c:a",
        "libopus",
        "-b:a",
        "128k",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

async function getLayerSourceUrl(layerId: string): Promise<string> {
  const base = await sceneLayersRepo.getById(layerId);
  if (!base) throw new Error("Layer not found");

  if (base.layerType === "background") {
    const bg = await backgroundLayersRepo.getByLayerId(layerId);
    if (bg?.sourceUrl) return bg.sourceUrl;
  } else if (base.layerType === "overlay") {
    const ov = await overlayLayersRepo.getByLayerId(layerId);
    if (ov?.sourceUrl) return ov.sourceUrl;
  }

  throw new Error("Layer has no source video");
}

async function updateLayerMetadata(
  layerId: string,
  processedVideoKey: string,
): Promise<void> {
  const base = await sceneLayersRepo.getById(layerId);
  if (!base) return;

  if (base.layerType === "background") {
    const bg = await backgroundLayersRepo.getByLayerId(layerId);
    const existing = (bg?.metadata as Record<string, any>) || {};
    await backgroundLayersRepo.updateByLayerId(layerId, {
      metadata: {
        ...existing,
        bgRemoval: { ...(existing.bgRemoval || {}), processedVideoKey },
      },
    });
  } else if (base.layerType === "overlay") {
    const ov = await overlayLayersRepo.getByLayerId(layerId);
    if (!ov) return;
    const existing = (ov.metadata as Record<string, any>) || {};
    await overlayLayersRepo.update(ov.id, {
      metadata: {
        ...existing,
        bgRemoval: { ...(existing.bgRemoval || {}), processedVideoKey },
      },
    });
  }
}

export const backgroundRemovalService = {
  getStatus(layerId: string): ProcessingJob | null {
    return jobs.get(jobKey(layerId)) || null;
  },

  async startProcessing(
    layerId: string,
    scriptId: string,
    _userId: string,
  ): Promise<{ started: boolean }> {
    const key = jobKey(layerId);
    const existing = jobs.get(key);
    if (existing?.status === "processing" || existing?.status === "encoding") {
      return { started: false };
    }

    const job: ProcessingJob = {
      status: "pending",
      progress: 0,
      processedFrames: 0,
      totalFrames: 0,
    };
    jobs.set(key, job);

    this._processInBackground(layerId, scriptId, job).catch((err) => {
      logger.error("Background removal failed", {
        layerId,
        error: err.message,
      });
      job.status = "failed";
      job.error = err.message;
    });

    return { started: true };
  },

  async _processInBackground(
    layerId: string,
    scriptId: string,
    job: ProcessingJob,
  ): Promise<void> {
    const sourceUrl = await getLayerSourceUrl(layerId);

    const tempDir = path.join(
      tmpdir(),
      `bg-removal-${layerId}-${Date.now()}`,
    );
    const framesDir = path.join(tempDir, "frames");
    const processedDir = path.join(tempDir, "processed");
    await fs.mkdir(framesDir, { recursive: true });
    await fs.mkdir(processedDir, { recursive: true });

    const inputPath = path.join(tempDir, "input.mp4");
    const outputPath = path.join(tempDir, "output.webm");

    try {
      job.status = "processing";

      logger.info("BG removal: downloading video", { layerId });
      const { default: axios } = await import("axios");
      const response = await axios.get(sourceUrl, {
        responseType: "arraybuffer",
        timeout: 300_000,
      });
      await fs.writeFile(inputPath, Buffer.from(response.data));

      const info = await getVideoInfo(inputPath);
      logger.info("BG removal: video info", {
        layerId,
        ...info,
      });

      logger.info("BG removal: extracting frames", {
        layerId,
        fps: info.fps,
        maxHeight: BG_REMOVAL_MAX_HEIGHT,
      });
      await extractFrames(inputPath, framesDir, info.fps, BG_REMOVAL_MAX_HEIGHT);

      const frameFiles = (await fs.readdir(framesDir))
        .filter((f) => f.endsWith(".png"))
        .sort();

      job.totalFrames = frameFiles.length;
      logger.info("BG removal: processing frames", {
        layerId,
        total: frameFiles.length,
      });

      const { removeBackground } = await import(
        "@imgly/background-removal-node"
      );

      let failedFrames = 0;
      let completedFrames = 0;

      const processFrame = async (i: number) => {
        const inputFrame = path.join(framesDir, frameFiles[i]);
        const outputFrame = path.join(processedDir, frameFiles[i]);

        try {
          const inputBuffer = await fs.readFile(inputFrame);
          const resultBlob = await removeBackground(
            new Blob([inputBuffer], { type: "image/png" }),
            { output: { format: "image/png" } },
          );
          const resultBuffer = Buffer.from(await resultBlob.arrayBuffer());
          await fs.writeFile(outputFrame, resultBuffer);

          if (completedFrames === 0) {
            logger.info("BG removal: first frame processed successfully", {
              layerId,
            });
          }
        } catch (frameErr) {
          failedFrames++;
          logger.warn("BG removal: frame failed, using original", {
            layerId,
            frame: frameFiles[i],
            error:
              frameErr instanceof Error ? frameErr.message : String(frameErr),
          });
          await fs.copyFile(inputFrame, outputFrame);
        }

        await fs.unlink(inputFrame).catch(() => {});
        completedFrames++;
        job.processedFrames = completedFrames;
        job.progress = completedFrames / frameFiles.length;
      };

      for (let i = 0; i < frameFiles.length; i += BG_REMOVAL_CONCURRENCY) {
        const batch = frameFiles
          .slice(i, i + BG_REMOVAL_CONCURRENCY)
          .map((_, idx) => processFrame(i + idx));
        await Promise.all(batch);
      }

      if (failedFrames > 0) {
        logger.warn("BG removal: frames summary", {
          layerId,
          total: frameFiles.length,
          failed: failedFrames,
          success: frameFiles.length - failedFrames,
        });
      }

      job.status = "encoding";
      logger.info("BG removal: encoding WebM VP9 alpha", { layerId });
      await encodeWebmAlpha(
        path.join(processedDir, "frame-%06d.png"),
        inputPath,
        outputPath,
        info.fps,
      );

      logger.info("BG removal: uploading to R2", { layerId });
      const outputBuffer = await fs.readFile(outputPath);
      const r2Key = `processed-video/${scriptId}/${layerId}/${Date.now()}.webm`;
      await storageRepo.uploadFile(outputBuffer, r2Key, "video/webm");

      await updateLayerMetadata(layerId, r2Key);

      job.status = "ready";
      job.progress = 1;
      job.processedVideoKey = r2Key;

      logger.info("BG removal: completed", {
        layerId,
        r2Key,
        totalFrames: frameFiles.length,
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  },

  async getProcessedVideoPresignedUrl(
    layerId: string,
  ): Promise<string | null> {
    const base = await sceneLayersRepo.getById(layerId);
    if (!base) return null;

    let metadata: Record<string, any> | null = null;
    if (base.layerType === "background") {
      const bg = await backgroundLayersRepo.getByLayerId(layerId);
      metadata = (bg?.metadata as Record<string, any>) ?? null;
    } else if (base.layerType === "overlay") {
      const ov = await overlayLayersRepo.getByLayerId(layerId);
      metadata = (ov?.metadata as Record<string, any>) ?? null;
    }

    const r2Key = metadata?.bgRemoval?.processedVideoKey;
    if (!r2Key) return null;

    return await storageRepo.getPresignedUrl(r2Key);
  },
};
