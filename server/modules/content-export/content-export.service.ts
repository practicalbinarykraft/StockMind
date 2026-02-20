import archiver from "archiver";
import type { Writable } from "stream";
import { logger } from "../../lib/logger";
import { sceneLayersService } from "../scene-layers/scene-layers.service";
import { scriptsMediaService } from "../scripts-media/scripts-media.service";
import { storageService } from "../storage/storage.service";

interface SceneFromScript {
  text?: string;
  audioUrl?: string;
  order?: number;
  [key: string]: unknown;
}

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase();
    if (ext && ["mp3", "wav", "ogg", "mp4", "webm", "jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return ext;
    }
  } catch {
    // ignore
  }
  return "bin";
}

async function fetchBufferFromUrl(url: string): Promise<Buffer | null> {
  const key = storageService.extractKeyFromUrl(url);
  if (!key) {
    logger.warn("Cannot extract key from URL, skipping", { url });
    return null;
  }
  try {
    return await storageService.getFileBuffer(key);
  } catch (error) {
    logger.warn("Failed to fetch file from storage, skipping", { key, error });
    return null;
  }
}

export const contentExportService = {
  async streamArchive(scriptId: string, userId: string, output: Writable): Promise<string> {
    const { script, scenes } = await sceneLayersService.getScriptWithLayers(scriptId, userId);
    const media = await scriptsMediaService.findByScriptId(scriptId);

    const title = (script.title || "script").replace(/[^a-zA-Z0-9а-яА-ЯёЁ _-]/g, "_");
    const rootDir = `script-${title}`;

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(output);

    archive.on("error", (err) => {
      logger.error("Archiver error", { scriptId, error: err.message });
      throw err;
    });

    // script.txt — full script text
    const fullText = scenes
      .map((s, i) => {
        const sceneData = s.scene as SceneFromScript;
        return `--- Сцена ${i + 1} ---\n${sceneData.text || "(пусто)"}`;
      })
      .join("\n\n");
    archive.append(fullText, { name: `${rootDir}/script.txt` });

    // Full audio (from scriptsMedia)
    if (media?.audioUrl) {
      const buf = await fetchBufferFromUrl(media.audioUrl);
      if (buf) {
        const ext = getExtensionFromUrl(media.audioUrl);
        archive.append(buf, { name: `${rootDir}/audio-full.${ext}` });
      }
    }

    // Per-scene content
    for (let i = 0; i < scenes.length; i++) {
      const sceneWithLayers = scenes[i];
      const sceneData = sceneWithLayers.scene as SceneFromScript;
      const sceneDir = `${rootDir}/scene-${String(i + 1).padStart(2, "0")}`;

      // text.txt
      archive.append(sceneData.text || "(пусто)", { name: `${sceneDir}/text.txt` });

      // scene audio
      if (sceneData.audioUrl) {
        const buf = await fetchBufferFromUrl(sceneData.audioUrl);
        if (buf) {
          const ext = getExtensionFromUrl(sceneData.audioUrl);
          archive.append(buf, { name: `${sceneDir}/audio.${ext}` });
        }
      }

      // layers media
      for (const layer of sceneWithLayers.layers) {
        if (layer.background?.sourceUrl) {
          const buf = await fetchBufferFromUrl(layer.background.sourceUrl);
          if (buf) {
            const ext = getExtensionFromUrl(layer.background.sourceUrl);
            archive.append(buf, { name: `${sceneDir}/background.${ext}` });
          }
        }

        if (layer.overlay?.sourceUrl) {
          const buf = await fetchBufferFromUrl(layer.overlay.sourceUrl);
          if (buf) {
            const ext = getExtensionFromUrl(layer.overlay.sourceUrl);
            archive.append(buf, { name: `${sceneDir}/overlay.${ext}` });
          }
        }
      }
    }

    await archive.finalize();

    return `${title}.zip`;
  },
};
