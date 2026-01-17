import axios from "axios";
import fs from "fs";
import path from "path";
import { logger } from "../../lib/logger";
import { apiKeysService } from "../api-keys/api-keys.service";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";
import { HeygenRepo } from "./heygen.repo";
import {
  HeygenApiKeyNotFoundError,
  HeygenFetchAvatarsError,
  HeygenGenerateVideoError,
  HeygenVideoStatusError,
  ProxyDomainNotAllowedError,
  ProxyRateLimitError,
  ProxyTimeoutError,
  ProxyNotFoundError,
} from "./heygen.errors";
import type { GetAvatarsQueryDto, GenerateVideoDto } from "./heygen.dto";

/**
 * Types and interfaces
 */
const HEYGEN_API_BASE = "https://api.heygen.com";
const HEYGEN_UPLOAD_BASE = "https://upload.heygen.com";
const ALLOWED_AUDIO_DIR = path.join(process.cwd(), "uploads", "audio");

// In-memory cache for avatars (per API key)
interface AvatarCache {
  avatars: HeyGenAvatar[];
  timestamp: number;
}
const avatarCache = new Map<string, AvatarCache>();
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender?: string;
  preview_image_url?: string;
  preview_video_url?: string;
  is_public?: boolean;
}

export interface HeyGenVideoRequest {
  avatar_id: string;
  script: string;
  audio_url?: string;
  voice_id?: string;
  dimension?: {
    width: number;
    height: number;
  };
}

export interface HeyGenVideoStatus {
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error_message?: string;
}

/**
 * HeyGen Service
 * Бизнес-логика для работы с HeyGen API
 */
export class HeygenService {
  private repo: HeygenRepo;

  constructor() {
    this.repo = new HeygenRepo();
  }

  /**
   * Получить расшифрованный HeyGen API ключ
   */
  private async getDecryptedApiKey(userId: string): Promise<string> {
    try {
      const apiKey = await apiKeysService.getUserApiKey(userId, "heygen");
      return apiKey.decryptedKey;
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        throw new HeygenApiKeyNotFoundError();
      }
      throw error;
    }
  }

  /**
   * Fetch avatars from HeyGen API
   */
  private async fetchHeyGenAvatarsFromAPI(apiKey: string): Promise<HeyGenAvatar[]> {
    try {
      // Check cache first (using API key hash as cache key for security)
      const cacheKey = Buffer.from(apiKey).toString("base64").substring(0, 32);
      const cached = avatarCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        const age = Math.round((Date.now() - cached.timestamp) / 1000);
        console.log(`💾 Using cached avatars (${cached.avatars.length} avatars, cached ${age}s ago)`);
        return cached.avatars;
      }

      const startTime = Date.now();
      console.log("📡 Fetching avatars from HeyGen API...");

      const response = await axios.get(`${HEYGEN_API_BASE}/v2/avatars`, {
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
        timeout: 240000, // 240 second timeout
      });

      const avatars = response.data?.data?.avatars || [];

      if (avatars.length > 0) {
        console.log("🔍 Sample avatar structure from HeyGen:", JSON.stringify(avatars[0], null, 2));
      }

      // Remove duplicates by avatar_id and add is_public flag
      const uniqueAvatars = Array.from(
        new Map(avatars.map((avatar: HeyGenAvatar) => [avatar.avatar_id, avatar])).values()
      ).map((avatar) => {
        const avatarAny = avatar as any;
        const isPublic = avatarAny.is_public ?? avatarAny.public ?? avatarAny.avatar_style === "public";

        return {
          ...(avatar as HeyGenAvatar),
          is_public: !!isPublic,
        };
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Fetched ${uniqueAvatars.length} avatars from HeyGen in ${duration}ms`);

      const myAvatars = uniqueAvatars.filter((a) => !a.is_public);
      const publicAvatars = uniqueAvatars.filter((a) => a.is_public);
      const allAvatars = [...myAvatars, ...publicAvatars];

      console.log(`📊 Returning ${allAvatars.length} avatars (${myAvatars.length} my, ${publicAvatars.length} public)`);

      // Cache ALL avatars
      avatarCache.set(cacheKey, {
        avatars: allAvatars,
        timestamp: Date.now(),
      });

      // Clean up old cache entries (keep only last 10)
      if (avatarCache.size > 10) {
        const oldestKey = Array.from(avatarCache.keys())[0];
        avatarCache.delete(oldestKey);
        console.log("🗑️ Cleaned up old avatar cache entry");
      }

      return allAvatars;
    } catch (error: any) {
      console.error("HeyGen API error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch avatars from HeyGen");
    }
  }

  /**
   * Upload audio to HeyGen
   */
  private async uploadAudioToHeyGen(apiKey: string, audioPath: string): Promise<string> {
    try {
      // Security: Validate that the file path is within allowed directory
      const normalizedPath = path.normalize(path.resolve(audioPath));
      const allowedDirWithSep = ALLOWED_AUDIO_DIR + path.sep;

      console.log(`📤 Uploading audio to HeyGen:`);
      console.log(`   Original: ${audioPath}`);
      console.log(`   Normalized: ${normalizedPath}`);
      console.log(`   Allowed dir: ${ALLOWED_AUDIO_DIR}`);

      if (normalizedPath !== ALLOWED_AUDIO_DIR && !normalizedPath.startsWith(allowedDirWithSep)) {
        throw new Error("Invalid audio file path: access denied");
      }

      if (!fs.existsSync(normalizedPath) || !fs.statSync(normalizedPath).isFile()) {
        throw new Error("Audio file not found or is not a file");
      }

      const audioBuffer = fs.readFileSync(normalizedPath);

      const uploadResponse = await axios.post(`${HEYGEN_UPLOAD_BASE}/v1/asset`, audioBuffer, {
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "audio/mpeg",
        },
      });

      const assetId = uploadResponse.data?.data?.id;
      if (!assetId) {
        throw new Error("No asset_id returned from HeyGen upload");
      }

      console.log(`✅ Audio uploaded to HeyGen: ${assetId}`);
      return assetId;
    } catch (error: any) {
      console.error("Audio upload error:", error.response?.data || error.message);
      throw new Error("Failed to upload audio to HeyGen");
    }
  }

  /**
   * Generate video with HeyGen API
   */
  private async generateHeyGenVideoFromAPI(apiKey: string, request: HeyGenVideoRequest): Promise<string> {
    try {
      let voiceConfig;

      if (request.audio_url) {
        console.log(`🎵 Using audio mode with file: ${request.audio_url}`);

        const audioPath = request.audio_url.startsWith("/")
          ? path.join(process.cwd(), request.audio_url)
          : path.join(process.cwd(), request.audio_url);

        console.log(`📁 Resolved audio path: ${audioPath}`);

        const audioAssetId = await this.uploadAudioToHeyGen(apiKey, audioPath);

        voiceConfig = {
          type: "audio",
          audio_asset_id: audioAssetId,
        };
      } else {
        console.log("📝 Using text-to-speech mode");
        voiceConfig = {
          type: "text",
          input_text: request.script,
          voice_id: request.voice_id || "2d5b0e6cf36f460aa7fc47e3eee4ba54",
          speed: 1.0,
        };
      }

      const payload = {
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: request.avatar_id,
              avatar_style: "normal",
            },
            voice: voiceConfig,
          },
        ],
        dimension: request.dimension || {
          width: 1280,
          height: 720,
        },
      };

      console.log("🎬 Generating video with HeyGen...");

      const response = await axios.post(`${HEYGEN_API_BASE}/v2/video/generate`, payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
      });

      const videoId = response.data?.data?.video_id;
      if (!videoId) {
        throw new Error("No video_id returned from HeyGen");
      }

      console.log(`✅ Video generation started: ${videoId}`);
      return videoId;
    } catch (error: any) {
      console.error("HeyGen video generation error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to generate video with HeyGen");
    }
  }

  /**
   * Get video status from HeyGen API
   */
  private async getHeyGenVideoStatusFromAPI(apiKey: string, videoId: string): Promise<HeyGenVideoStatus> {
    try {
      const response = await axios.get(`${HEYGEN_API_BASE}/v1/video_status.get`, {
        params: { video_id: videoId },
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
      });

      const data = response.data?.data;

      return {
        status: data?.status || "pending",
        video_url: data?.video_url,
        thumbnail_url: data?.thumbnail_url,
        duration: data?.duration,
        error_message: data?.error_message,
      };
    } catch (error: any) {
      console.error("HeyGen status check error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to check video status");
    }
  }

  /**
   * Получить список аватаров с пагинацией
   */
  async fetchAvatars(userId: string, query: GetAvatarsQueryDto) {
    const { page, limit } = query;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Fetching HeyGen avatars", { userId, page, limit });

    try {
      // Fetch ALL avatars (cached)
      const allAvatars = await this.fetchHeyGenAvatarsFromAPI(decryptedKey);

      // Apply pagination
      const offset = page * limit;
      const paginatedAvatars = allAvatars.slice(offset, offset + limit);
      const totalPages = Math.ceil(allAvatars.length / limit);

      logger.debug("Returning paginated avatars", {
        total: allAvatars.length,
        page,
        limit,
        returned: paginatedAvatars.length,
        totalPages,
      });

      return {
        avatars: paginatedAvatars,
        pagination: {
          page,
          limit,
          total: allAvatars.length,
          totalPages,
          hasNextPage: page < totalPages - 1,
        },
      };
    } catch (error: any) {
      logger.error("Error fetching HeyGen avatars", { error: error.message });
      throw new HeygenFetchAvatarsError(error.message);
    }
  }

  /**
   * Сгенерировать видео с аватаром
   */
  async generateVideo(userId: string, dto: GenerateVideoDto) {
    const { avatarId, script, audioUrl, voiceId, dimension } = dto;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.info("Generating HeyGen video", { userId, avatarId, mode: audioUrl ? "audio" : "text" });

    try {
      const videoId = await this.generateHeyGenVideoFromAPI(decryptedKey, {
        avatar_id: avatarId,
        script,
        audio_url: audioUrl,
        voice_id: voiceId,
        dimension,
      });

      return { videoId };
    } catch (error: any) {
      logger.error("Error generating HeyGen video", { error: error.message });

      const status = error.statusCode || error.response?.status || 500;
      const apiMessage = error.apiMessage || error.message;

      throw new HeygenGenerateVideoError(
        error.message || "Failed to generate HeyGen video",
        status,
        apiMessage
      );
    }
  }

  /**
   * Получить статус генерации видео
   */
  async getVideoStatus(userId: string, videoId: string) {
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Checking HeyGen video status", { videoId });

    try {
      const status = await this.getHeyGenVideoStatusFromAPI(decryptedKey, videoId);
      return status;
    } catch (error: any) {
      logger.error("Error checking HeyGen video status", { error: error.message, videoId });

      const statusCode = error.statusCode || error.response?.status || 500;
      const apiMessage = error.apiMessage || error.message;

      throw new HeygenVideoStatusError(error.message || "Failed to check video status", statusCode, apiMessage);
    }
  }

  /**
   * Проксировать изображение
   */
  async proxyImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
    // Validate domain
    const parsedUrl = new URL(url);
    if (!this.repo.isDomainAllowed(parsedUrl.hostname)) {
      logger.warn("Blocked image proxy attempt to disallowed domain", {
        hostname: parsedUrl.hostname,
        url,
      });
      throw new ProxyDomainNotAllowedError(parsedUrl.hostname);
    }

    // Rate limiting
    if (!this.repo.canMakeImageRequest()) {
      logger.warn("Image proxy rate limit exceeded", {
        active: this.repo.getActiveImageRequestsCount(),
        max: 10,
      });
      throw new ProxyRateLimitError();
    }

    const requestId = `${Date.now()}-${Math.random()}`;
    this.repo.trackImageRequest(requestId);

    try {
      logger.debug("Proxying HeyGen image", {
        url: url.substring(0, 100),
        activeRequests: this.repo.getActiveImageRequestsCount(),
      });

      const result = await this.repo.fetchImage(url);
      return result;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          logger.error("Image proxy timeout", { url });
          throw new ProxyTimeoutError("image");
        }
        if (error.response?.status === 404) {
          throw new ProxyNotFoundError("image");
        }
      }
      logger.error("Error proxying HeyGen image", { error: error.message, url });
      throw error;
    } finally {
      this.repo.untrackImageRequest(requestId);
    }
  }

  /**
   * Проксировать видео
   */
  async proxyVideo(
    url: string,
    rangeHeader?: string,
    download?: string
  ): Promise<{
    stream: any;
    status: number;
    headers: Record<string, string>;
    filename?: string;
  }> {
    // Validate domain
    const parsedUrl = new URL(url);
    if (!this.repo.isDomainAllowed(parsedUrl.hostname)) {
      logger.warn("Blocked video proxy attempt to disallowed domain", {
        hostname: parsedUrl.hostname,
        url,
      });
      throw new ProxyDomainNotAllowedError(parsedUrl.hostname);
    }

    logger.debug("Proxying HeyGen video", { url: url.substring(0, 100), download: !!download });

    try {
      const result = await this.repo.fetchVideoStream(url, rangeHeader);

      const contentType = result.headers["content-type"] || "video/mp4";
      const contentLength = result.headers["content-length"];
      const contentRange = result.headers["content-range"];
      const acceptRanges = result.headers["accept-ranges"];

      const responseHeaders: Record<string, string> = {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      };

      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength;
      }

      if (contentRange) {
        responseHeaders["Content-Range"] = contentRange;
      }

      if (acceptRanges) {
        responseHeaders["Accept-Ranges"] = acceptRanges;
      } else {
        responseHeaders["Accept-Ranges"] = "bytes";
      }

      let filename: string | undefined;
      if (download === "true") {
        const urlPath = parsedUrl.pathname;
        filename = urlPath.split("/").pop() || "heygen-video.mp4";
        responseHeaders["Content-Disposition"] = `attachment; filename="${filename}"`;
      }

      return {
        stream: result.stream,
        status: result.status,
        headers: responseHeaders,
        filename,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          logger.error("Video proxy timeout", { url });
          throw new ProxyTimeoutError("video");
        }
        if (error.response?.status === 404) {
          throw new ProxyNotFoundError("video");
        }
        if (error.response?.status === 416) {
          throw new Error("Range not satisfiable");
        }
      }
      logger.error("Error proxying HeyGen video", { error: error.message, url });
      throw error;
    }
  }
}

export const heygenService = new HeygenService();
