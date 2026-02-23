import axios from "axios";
import http from "http";
import https from "https";
import { logger } from "../../lib/logger";

// Allowed domains for media proxying (security measure)
const ALLOWED_HEYGEN_DOMAINS = [
  "files.heygen.ai",
  "files2.heygen.ai",
  "resource.heygen.ai",
  "resource2.heygen.ai",
  "api.heygen.com",
];

// Simple rate limiter for image proxy
const activeImageRequests = new Set<string>();
const MAX_CONCURRENT_IMAGE_REQUESTS = 10;

// Keep-alive agents for persistent connections to HeyGen CDN
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10, keepAliveMsecs: 30000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10, keepAliveMsecs: 30000 });

const VIDEO_RETRY_COUNT = 3;
const VIDEO_RETRY_DELAY_MS = 1000;

/**
 * HeyGen Repository
 * Работа с внешним API HeyGen и проксирование медиа
 */
export class HeygenRepo {
  /**
   * Проверить, разрешен ли домен для проксирования
   */
  isDomainAllowed(hostname: string): boolean {
    return ALLOWED_HEYGEN_DOMAINS.includes(hostname);
  }

  /**
   * Проверить лимит активных запросов изображений
   */
  canMakeImageRequest(): boolean {
    return activeImageRequests.size < MAX_CONCURRENT_IMAGE_REQUESTS;
  }

  /**
   * Добавить запрос изображения в трекинг
   */
  trackImageRequest(requestId: string): void {
    activeImageRequests.add(requestId);
  }

  /**
   * Удалить запрос изображения из трекинга
   */
  untrackImageRequest(requestId: string): void {
    activeImageRequests.delete(requestId);
  }

  /**
   * Получить количество активных запросов
   */
  getActiveImageRequestsCount(): number {
    return activeImageRequests.size;
  }

  /**
   * Проксировать изображение из HeyGen
   */
  async fetchImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        Accept: "image/*",
        "User-Agent": "StockMind/1.0",
        "Connection": "keep-alive",
      },
      httpAgent,
      httpsAgent,
      maxRedirects: 5,
    });

    const contentType = response.headers["content-type"] || "image/webp";
    return {
      buffer: Buffer.from(response.data),
      contentType,
    };
  }

  /**
   * Проксировать видео из HeyGen (stream) с retry-логикой
   */
  async fetchVideoStream(
    url: string,
    rangeHeader?: string
  ): Promise<{
    stream: any;
    status: number;
    headers: Record<string, any>;
  }> {
    const requestHeaders: Record<string, string> = {
      "User-Agent": "StockMind/1.0",
      "Connection": "keep-alive",
    };

    if (rangeHeader) {
      requestHeaders["Range"] = rangeHeader;
    }

    let lastError: any;
    for (let attempt = 1; attempt <= VIDEO_RETRY_COUNT; attempt++) {
      try {
        const response = await axios.get(url, {
          responseType: "stream",
          timeout: 60000,
          headers: requestHeaders,
          httpAgent,
          httpsAgent,
          validateStatus: (status) => status >= 200 && status < 300,
        });

        return {
          stream: response.data,
          status: response.status,
          headers: response.headers,
        };
      } catch (error: any) {
        lastError = error;

        const status = error.response?.status;
        if (status === 404 || status === 403 || status === 416) {
          throw error;
        }

        if (attempt < VIDEO_RETRY_COUNT) {
          const delay = VIDEO_RETRY_DELAY_MS * attempt;
          logger.warn(`Video proxy attempt ${attempt}/${VIDEO_RETRY_COUNT} failed, retrying in ${delay}ms`, {
            url: url.substring(0, 100),
            error: error.code || error.message,
          });
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError;
  }
}
