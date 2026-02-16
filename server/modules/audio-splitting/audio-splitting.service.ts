import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";
import { logger } from "../../lib/logger";
import { scriptsLibraryService } from "../scripts-library/scripts-library.service";
import { StorageRepo } from "../storage/storage.repo";

const storageRepo = new StorageRepo();

interface SceneWithTime {
  start?: number;
  end?: number;
  duration?: number;
  [key: string]: unknown;
}

function getStartEnd(scene: SceneWithTime, index: number, accumulatedStart: number): { start: number; end: number } {
  if (typeof scene.start === "number" && typeof scene.end === "number") {
    return { start: scene.start, end: scene.end };
  }
  const duration = typeof scene.duration === "number" ? scene.duration : 5;
  const start = accumulatedStart;
  const end = start + duration;
  return { start, end };
}

function pFfmpegSegment(
  inputPath: string,
  outputPath: string,
  startSeconds: number,
  durationSeconds: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSeconds)
      .setDuration(durationSeconds)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

export const audioSplittingService = {
  /**
   * Разделить аудио по сценам и загрузить части в R2.
   * Пути в R2: users/{userId}/projects/{projectId}/audio/scene-{sceneNumber}.mp3
   */
  async splitAudioByScenes(
    scriptId: string,
    userId: string,
    audioUrl: string
  ): Promise<{ sceneUrls: string[] }> {
    const script = await scriptsLibraryService.getScriptById(scriptId, userId);
    const scenes = (script.scenes as SceneWithTime[]) ?? [];
    if (scenes.length === 0) {
      return { sceneUrls: [] };
    }

    const projectId = (script as { projectId?: string }).projectId ?? "default";
    const prefix = `users/${userId}/projects/${projectId}/audio`;

    let accumulatedStart = 0;
    const sceneRanges = scenes.map((scene, index) => {
      const { start, end } = getStartEnd(scene, index, accumulatedStart);
      accumulatedStart = end;
      return { index, start, end, duration: end - start };
    });

    const tempDir = path.join(tmpdir(), `audio-split-${scriptId}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const inputPath = path.join(tempDir, "input.mp3");

    try {
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

      const sceneUrls: string[] = [];

      for (const { index, start, duration } of sceneRanges) {
        const outputPath = path.join(tempDir, `scene-${index + 1}.mp3`);
        await pFfmpegSegment(inputPath, outputPath, start, duration);
        const buffer = await fs.readFile(outputPath);
        const r2Key = `${prefix}/scene-${index + 1}.mp3`;
        const url = await storageRepo.uploadWithPath(buffer, r2Key, "audio/mpeg");
        sceneUrls.push(url);
      }

      logger.info("Audio split by scenes completed", {
        scriptId,
        userId,
        sceneCount: sceneUrls.length,
      });
      return { sceneUrls };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  },
};
