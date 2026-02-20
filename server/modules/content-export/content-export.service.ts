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

const KNOWN_EXTENSIONS = ["mp3", "wav", "ogg", "mp4", "webm", "mov", "jpg", "jpeg", "png", "gif", "webp"];

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase();
    if (ext && KNOWN_EXTENSIONS.includes(ext)) {
      return ext;
    }
  } catch {
    // ignore
  }
  return "bin";
}

async function fetchBufferFromUrl(url: string, context?: string): Promise<Buffer | null> {
  const key = storageService.extractKeyFromUrl(url);
  if (!key) {
    logger.warn("[ContentExport] Cannot extract key from URL, skipping", { url, context });
    return null;
  }
  try {
    const buf = await storageService.getFileBuffer(key);
    logger.info("[ContentExport] Fetched file", { key, size: buf.length, context });
    return buf;
  } catch (error) {
    logger.warn("[ContentExport] Failed to fetch file from storage, skipping", { key, error, context });
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
      const buf = await fetchBufferFromUrl(media.audioUrl, "audio-full");
      if (buf) {
        const ext = getExtensionFromUrl(media.audioUrl);
        archive.append(buf, { name: `${rootDir}/audio-full.${ext}` });
      }
    }

    // Full avatar video (from scriptsMedia) — spans the entire scenario duration
    if (media?.videoUrl && media.videoStatus === "completed") {
      const buf = await fetchBufferFromUrl(media.videoUrl, "video-avatar");
      if (buf) {
        const ext = getExtensionFromUrl(media.videoUrl);
        archive.append(buf, { name: `${rootDir}/video-avatar.${ext}` });
        logger.info("[ContentExport] Added avatar video to archive root", { scriptId, size: buf.length });
      }
    }

    // Per-scene content
    for (let i = 0; i < scenes.length; i++) {
      const sceneWithLayers = scenes[i];
      const sceneData = sceneWithLayers.scene as SceneFromScript;
      const sceneDir = `${rootDir}/scene-${String(i + 1).padStart(2, "0")}`;
      const sceneNum = i + 1;

      // text.txt
      archive.append(sceneData.text || "(пусто)", { name: `${sceneDir}/text.txt` });

      // scene audio
      if (sceneData.audioUrl) {
        const buf = await fetchBufferFromUrl(sceneData.audioUrl, `scene-${sceneNum}/audio`);
        if (buf) {
          const ext = getExtensionFromUrl(sceneData.audioUrl);
          archive.append(buf, { name: `${sceneDir}/audio.${ext}` });
        }
      }

      // layers media
      let bgIndex = 0;
      let ovIndex = 0;
      for (const layer of sceneWithLayers.layers) {
        const layerType = layer.base.layerType;
        const isVisible = layer.base.isVisible;

        if (layer.background) {
          const bg = layer.background;
          const contentType = (bg as any).contentType as string | undefined;
          logger.info("[ContentExport] Scene layer", {
            sceneNum,
            layerType,
            contentType,
            hasSourceUrl: !!bg.sourceUrl,
            isVisible,
          });

          // Skip avatar-type backgrounds — the full avatar video is already at the root level
          if (contentType === "avatar") continue;

          if (bg.sourceUrl) {
            const buf = await fetchBufferFromUrl(bg.sourceUrl, `scene-${sceneNum}/background`);
            if (buf) {
              const ext = getExtensionFromUrl(bg.sourceUrl);
              const suffix = bgIndex > 0 ? `-${bgIndex + 1}` : "";
              archive.append(buf, { name: `${sceneDir}/background${suffix}.${ext}` });
              bgIndex++;
            }
          }
        }

        if (layer.overlay) {
          const ov = layer.overlay;
          const contentType = (ov as any).contentType as string | undefined;
          logger.info("[ContentExport] Scene layer", {
            sceneNum,
            layerType,
            contentType,
            hasSourceUrl: !!ov.sourceUrl,
            isVisible,
          });

          if (ov.sourceUrl) {
            const buf = await fetchBufferFromUrl(ov.sourceUrl, `scene-${sceneNum}/overlay`);
            if (buf) {
              const ext = getExtensionFromUrl(ov.sourceUrl);
              const suffix = ovIndex > 0 ? `-${ovIndex + 1}` : "";
              archive.append(buf, { name: `${sceneDir}/overlay${suffix}.${ext}` });
              ovIndex++;
            }
          }
        }
      }
    }

    await archive.finalize();

    return `${title}.zip`;
  },
};
