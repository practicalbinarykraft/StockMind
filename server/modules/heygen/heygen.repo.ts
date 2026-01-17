import axios from "axios";
import { logger } from "../../lib/logger";

// Allowed domains for media proxying (security measure)
const ALLOWED_HEYGEN_DOMAINS = [
  "files.heygen.ai",
  "files2.heygen.ai",
  "resource.heygen.ai",
  "api.heygen.com",
];

// Simple rate limiter for image proxy
const activeImageRequests = new Set<string>();
const MAX_CONCURRENT_IMAGE_REQUESTS = 10;

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
      timeout: 30000, // 30 second timeout
      headers: {
        Accept: "image/*",
        "User-Agent": "StockMind/1.0",
      },
      maxRedirects: 5,
    });

    const contentType = response.headers["content-type"] || "image/webp";
    return {
      buffer: Buffer.from(response.data),
      contentType,
    };
  }

  /**
   * Проксировать видео из HeyGen (stream)
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
    };

    if (rangeHeader) {
      requestHeaders["Range"] = rangeHeader;
    }

    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 120000, // 2 minute timeout for video
      headers: requestHeaders,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    return {
      stream: response.data,
      status: response.status,
      headers: response.headers,
    };
  }
}
