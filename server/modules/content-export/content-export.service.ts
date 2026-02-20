import archiver from "archiver";
import type { Writable } from "stream";
import axios from "axios";
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

function isR2Url(url: string): boolean {
  try {
    const endpoint = process.env.R2_ENDPOINT;
    if (!endpoint) return false;
    const r2Host = new URL(endpoint).hostname;
    const urlHost = new URL(url).hostname;
    return urlHost === r2Host || urlHost.endsWith(".r2.cloudflarestorage.com");
  } catch {
    return false;
  }
}

function urlCacheKey(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

async function fetchBufferFromR2(url: string, context?: string): Promise<Buffer | null> {
  const key = storageService.extractKeyFromUrl(url);
  if (!key) {
    logger.warn("[ContentExport] Cannot extract R2 key from URL, skipping", { url: url.slice(0, 120), context });
    return null;
  }
  try {
    const buf = await storageService.getFileBuffer(key);
    logger.info("[ContentExport] Fetched file from R2", { key, size: buf.length, context });
    return buf;
  } catch (error) {
    logger.warn("[ContentExport] Failed to fetch file from R2, will try HTTP fallback", { key, context });
    return fetchBufferFromHttp(url, context);
  }
}

async function fetchBufferFromHttp(url: string, context?: string): Promise<Buffer | null> {
  try {
    logger.info("[ContentExport] Downloading via HTTP", { host: new URL(url).hostname, context });
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120_000,
      maxContentLength: 500 * 1024 * 1024,
    });
    const buf = Buffer.from(response.data);
    logger.info("[ContentExport] Fetched file via HTTP", { size: buf.length, context });
    return buf;
  } catch (error: any) {
    const status = error.response?.status;
    logger.warn("[ContentExport] HTTP download failed, skipping", {
      host: (() => { try { return new URL(url).hostname; } catch { return "?"; } })(),
      status,
      error: error.message,
      context,
    });
    return null;
  }
}

/**
 * Download a file from URL with in-memory cache to avoid re-downloading the same file
 */
function createCachedFetcher() {
  const cache = new Map<string, Buffer | null>();

  return async function fetchBufferCached(url: string, context?: string): Promise<Buffer | null> {
    const ck = urlCacheKey(url);
    if (cache.has(ck)) {
      const cached = cache.get(ck)!;
      if (cached) {
        logger.info("[ContentExport] Using cached file", { size: cached.length, context });
      }
      return cached;
    }

    let buf: Buffer | null;
    if (isR2Url(url)) {
      buf = await fetchBufferFromR2(url, context);
    } else {
      buf = await fetchBufferFromHttp(url, context);
    }

    cache.set(ck, buf);
    return buf;
  };
}

export const contentExportService = {
  async streamArchive(scriptId: string, userId: string, output: Writable): Promise<string> {
    const { script, scenes } = await sceneLayersService.getScriptWithLayers(scriptId, userId);
    const media = await scriptsMediaService.findByScriptId(scriptId);
    const fetchBuffer = createCachedFetcher();

    const title = (script.title || "script").replace(/[^a-zA-Z0-9а-яА-ЯёЁ _-]/g, "_");
    const rootDir = `script-${title}`;

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(output);

    archive.on("error", (err) => {
      logger.error("Archiver error", { scriptId, error: err.message });
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
      const buf = await fetchBuffer(media.audioUrl, "audio-full");
      if (buf) {
        const ext = getExtensionFromUrl(media.audioUrl);
        archive.append(buf, { name: `${rootDir}/audio-full.${ext}` });
      }
    }

    // Full avatar video (from scriptsMedia) — spans the entire scenario duration
    if (media?.videoUrl && media.videoStatus === "completed") {
      const buf = await fetchBuffer(media.videoUrl, "video-avatar");
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
        const buf = await fetchBuffer(sceneData.audioUrl, `scene-${sceneNum}/audio`);
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

          // Skip avatar-type backgrounds — the full avatar video is already at the root level
          if (contentType === "avatar") {
            logger.debug("[ContentExport] Skipping avatar background layer", { sceneNum });
            continue;
          }

          if (bg.sourceUrl) {
            logger.info("[ContentExport] Processing background layer", {
              sceneNum, contentType, layerType, isVisible,
            });
            const buf = await fetchBuffer(bg.sourceUrl, `scene-${sceneNum}/background`);
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

          if (ov.sourceUrl) {
            logger.info("[ContentExport] Processing overlay layer", {
              sceneNum, contentType, layerType, isVisible,
            });
            const buf = await fetchBuffer(ov.sourceUrl, `scene-${sceneNum}/overlay`);
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
