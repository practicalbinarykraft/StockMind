/**
 * Универсальный загрузчик медиа-файлов.
 * Поддерживает R2 (через S3 SDK) и произвольные HTTP-источники (Kie.ai и др.).
 */

import axios from "axios";
import type { Readable } from "stream";
import { logger } from "../../lib/logger";
import { storageService } from "../storage/storage.service";

const KNOWN_EXTENSIONS = [
  "mp3", "wav", "ogg",
  "mp4", "webm", "mov",
  "jpg", "jpeg", "png", "gif", "webp",
];

export function isR2Url(url: string): boolean {
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

export function getExtensionFromUrl(url: string): string {
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

export function getContentTypeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };
  return map[ext] || "application/octet-stream";
}

export async function fetchBufferFromR2(url: string, context?: string): Promise<Buffer | null> {
  const key = storageService.extractKeyFromUrl(url);
  if (!key) {
    logger.warn("[MediaFetcher] Cannot extract R2 key from URL", { url: url.slice(0, 120), context });
    return null;
  }
  try {
    const buf = await storageService.getFileBuffer(key);
    logger.info("[MediaFetcher] Fetched file from R2", { key, size: buf.length, context });
    return buf;
  } catch {
    logger.warn("[MediaFetcher] R2 fetch failed, trying HTTP fallback", { key, context });
    return fetchBufferFromHttp(url, context);
  }
}

export async function fetchBufferFromHttp(url: string, context?: string): Promise<Buffer | null> {
  try {
    const host = new URL(url).hostname;
    logger.info("[MediaFetcher] Downloading via HTTP", { host, context });
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120_000,
      maxContentLength: 500 * 1024 * 1024,
    });
    const buf = Buffer.from(response.data);
    logger.info("[MediaFetcher] Fetched via HTTP", { size: buf.length, context });
    return buf;
  } catch (error: any) {
    const host = (() => { try { return new URL(url).hostname; } catch { return "?"; } })();
    logger.warn("[MediaFetcher] HTTP download failed", {
      host,
      status: error.response?.status,
      error: error.message,
      context,
    });
    return null;
  }
}

/**
 * Скачивает файл по URL, автоматически выбирая стратегию (R2 или HTTP).
 */
export async function fetchBuffer(url: string, context?: string): Promise<Buffer | null> {
  if (isR2Url(url)) {
    return fetchBufferFromR2(url, context);
  }
  return fetchBufferFromHttp(url, context);
}

export interface StreamResult {
  stream: Readable;
  contentLength?: number;
  contentType?: string;
}

/**
 * Получить presigned download URL для R2-файла.
 * Возвращает null если URL не из R2 или ключ не удалось извлечь.
 */
export async function getR2DownloadUrl(
  url: string,
  filename: string,
): Promise<string | null> {
  if (!isR2Url(url)) return null;

  const key = storageService.extractKeyFromUrl(url);
  if (!key) return null;

  try {
    return await storageService.getDownloadUrl(key, filename);
  } catch (error: any) {
    logger.warn("[MediaFetcher] Failed to generate R2 download URL", {
      key,
      error: error.message,
    });
    return null;
  }
}

/**
 * Стримит файл из HTTP-источника (для не-R2 файлов).
 */
export async function streamFromHttp(
  url: string,
  context?: string,
): Promise<StreamResult | null> {
  try {
    const host = new URL(url).hostname;
    logger.info("[MediaFetcher] Streaming via HTTP", { host, context });

    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 300_000,
      maxContentLength: 500 * 1024 * 1024,
    });

    return {
      stream: response.data as Readable,
      contentLength: response.headers["content-length"]
        ? parseInt(response.headers["content-length"], 10)
        : undefined,
      contentType: response.headers["content-type"] || undefined,
    };
  } catch (error: any) {
    const host = (() => {
      try { return new URL(url).hostname; } catch { return "?"; }
    })();
    logger.warn("[MediaFetcher] HTTP stream failed", {
      host,
      status: error.response?.status,
      error: error.message,
      context,
    });
    return null;
  }
}
