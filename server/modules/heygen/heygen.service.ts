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
import type { GetAvatarsQueryDto, GenerateVideoDto, GenerateWebmVideoDto } from "./heygen.dto";

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
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes (reduced for debugging)

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
   * Очистить кэш аватаров (для отладки)
   */
  clearAvatarCache(): void {
    const cacheSize = avatarCache.size;
    avatarCache.clear();
    console.log(`🗑️ Cleared avatar cache (${cacheSize} entries)`);
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
        
        // Логируем несколько аватаров для анализа
        console.log("🔍 Analyzing avatar fields for is_public detection:");
        avatars.slice(0, 5).forEach((av: any, idx: number) => {
          console.log(`  Avatar ${idx + 1}:`, {
            name: av.avatar_name,
            is_public: av.is_public,
            public: av.public,
            avatar_style: av.avatar_style,
            avatar_type: av.avatar_type,
          });
        });
      }

      // Remove duplicates by avatar_id and add is_public flag
      const uniqueAvatars = Array.from(
        new Map(avatars.map((avatar: HeyGenAvatar) => [avatar.avatar_id, avatar])).values()
      ).map((avatar) => {
        const avatarAny = avatar as any;
        
        // Определяем is_public:
        // - Проверяем различные варианты полей от HeyGen API
        // - Если поле отсутствует или undefined, считаем аватар публичным (безопасное значение по умолчанию)
        let isPublic: boolean;
        
        if (avatarAny.is_public !== undefined) {
          isPublic = !!avatarAny.is_public;
        } else if (avatarAny.public !== undefined) {
          isPublic = !!avatarAny.public;
        } else if (avatarAny.avatar_style !== undefined) {
          // Если avatar_style === "public", то это публичный аватар
          isPublic = avatarAny.avatar_style === "public";
        } else if (avatarAny.avatar_type !== undefined) {
          // Некоторые версии API используют avatar_type
          isPublic = avatarAny.avatar_type === "public" || avatarAny.avatar_type === "stock";
        } else {
          // По умолчанию считаем публичным (из библиотеки HeyGen)
          isPublic = true;
        }

        return {
          ...(avatar as HeyGenAvatar),
          is_public: isPublic,
        };
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Fetched ${uniqueAvatars.length} avatars from HeyGen in ${duration}ms`);

      const myAvatars = uniqueAvatars.filter((a) => !a.is_public);
      const publicAvatars = uniqueAvatars.filter((a) => a.is_public);
      const allAvatars = [...myAvatars, ...publicAvatars];

      console.log(`📊 Returning ${allAvatars.length} avatars (${myAvatars.length} my, ${publicAvatars.length} public)`);
      
      // Логируем примеры для отладки
      if (myAvatars.length > 0) {
        console.log("📝 Sample 'my' avatars:", myAvatars.slice(0, 3).map(a => ({ name: a.avatar_name, is_public: a.is_public })));
      }
      if (publicAvatars.length > 0) {
        console.log("📝 Sample 'public' avatars:", publicAvatars.slice(0, 3).map(a => ({ name: a.avatar_name, is_public: a.is_public })));
      };

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
   * Upload audio to HeyGen from a local file path
   */
  private async uploadAudioToHeyGen(apiKey: string, audioPath: string): Promise<string> {
    try {
      const normalizedPath = path.normalize(path.resolve(audioPath));
      const allowedDirWithSep = ALLOWED_AUDIO_DIR + path.sep;

      console.log(`📤 Uploading local audio to HeyGen:`);
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
      return await this.uploadBufferToHeyGen(apiKey, audioBuffer);
    } catch (error: any) {
      console.error("Audio upload error:", error.response?.data || error.message);
      throw new Error("Failed to upload audio to HeyGen");
    }
  }

  /**
   * Download audio from a remote URL and upload it to HeyGen
   */
  private async uploadAudioFromUrlToHeyGen(apiKey: string, audioUrl: string): Promise<string> {
    try {
      console.log(`📤 Downloading audio from URL and uploading to HeyGen:`);
      console.log(`   URL: ${audioUrl.substring(0, 120)}...`);

      const response = await axios.get(audioUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
      });

      const audioBuffer = Buffer.from(response.data);
      console.log(`📥 Downloaded audio: ${audioBuffer.length} bytes`);

      return await this.uploadBufferToHeyGen(apiKey, audioBuffer);
    } catch (error: any) {
      console.error("Audio download/upload error:", error.response?.data || error.message);
      throw new Error("Failed to download and upload audio to HeyGen");
    }
  }

  /**
   * Upload an audio buffer to HeyGen and return the asset ID
   */
  private async uploadBufferToHeyGen(apiKey: string, audioBuffer: Buffer): Promise<string> {
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
  }

  /**
   * Generate video with HeyGen API
   */
  private async generateHeyGenVideoFromAPI(apiKey: string, request: HeyGenVideoRequest): Promise<string> {
    try {
      let voiceConfig;

      if (request.audio_url) {
        console.log(`🎵 Using audio mode with file: ${request.audio_url}`);

        const isRemoteUrl = /^https?:\/\//i.test(request.audio_url);
        let audioAssetId: string;

        if (isRemoteUrl) {
          console.log(`🌐 Audio source is a remote URL`);
          audioAssetId = await this.uploadAudioFromUrlToHeyGen(apiKey, request.audio_url);
        } else {
          const audioPath = request.audio_url.startsWith("/")
            ? request.audio_url
            : path.join(process.cwd(), request.audio_url);

          console.log(`📁 Resolved audio path: ${audioPath}`);
          console.log(`📁 File exists: ${fs.existsSync(audioPath)}`);
          audioAssetId = await this.uploadAudioToHeyGen(apiKey, audioPath);
        }

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

      const videoInput: Record<string, any> = {
        character: {
          type: "avatar",
          avatar_id: request.avatar_id,
          avatar_style: "normal",
        },
        voice: voiceConfig,
      };

      const payload = {
        video_inputs: [videoInput],
        dimension: request.dimension || {
          width: 1280,
          height: 720,
        },
      };

      console.log("🎬 Generating video with HeyGen...");
      console.log("📦 Payload:", JSON.stringify(payload, null, 2));

      const response = await axios.post(`${HEYGEN_API_BASE}/v2/video/generate`, payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        timeout: 30000, // 30 second timeout
      });

      console.log("📨 HeyGen response status:", response.status);
      console.log("📨 HeyGen response data:", JSON.stringify(response.data, null, 2));

      const videoId = response.data?.data?.video_id;
      if (!videoId) {
        console.error("❌ No video_id in response:", response.data);
        throw new Error("No video_id returned from HeyGen");
      }

      console.log(`✅ Video generation started: ${videoId}`);
      return videoId;
    } catch (error: any) {
      // Детальное логирование ошибки
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = errorData?.message || errorData?.error || error.message;

        console.error("❌ HeyGen API error:", {
          status: statusCode,
          data: errorData,
          message: errorMessage,
        });

        // Пробрасываем ошибку с сохранением контекста
        const detailedError: any = new Error(
          errorMessage || "Failed to generate video with HeyGen"
        );
        detailedError.statusCode = statusCode;
        detailedError.apiMessage = errorMessage;
        throw detailedError;
      }

      console.error("❌ Unexpected error during video generation:", error);
      throw error;
    }
  }

  /**
   * Get video status from HeyGen API
   */
  private async getHeyGenVideoStatusFromAPI(apiKey: string, videoId: string): Promise<HeyGenVideoStatus> {
    try {
      const startTime = Date.now();
      console.log(`📡 Запрос статуса видео ${videoId} к HeyGen API...`);

      const response = await axios.get(`${HEYGEN_API_BASE}/v1/video_status.get`, {
        params: { video_id: videoId },
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
        timeout: 15000, // 15 second timeout for status check
      });

      const duration = Date.now() - startTime;
      const data = response.data?.data;

      console.log(`✅ Статус получен за ${duration}ms:`, {
        videoId,
        status: data?.status,
        hasVideoUrl: !!data?.video_url,
        error: data?.error_message,
      });

      return {
        status: data?.status || "pending",
        video_url: data?.video_url,
        thumbnail_url: data?.thumbnail_url,
        duration: data?.duration,
        error_message: data?.error_message,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data;
        
        console.error("❌ Ошибка проверки статуса HeyGen:", {
          videoId,
          status: statusCode,
          error: errorData,
          message: error.message,
        });
      } else {
        console.error("❌ Неожиданная ошибка проверки статуса:", error);
      }

      throw new Error(error.response?.data?.message || "Failed to check video status");
    }
  }

  /**
   * Получить информацию о квоте пользователя
   */
  async getUserQuota(userId: string) {
    const apiKey = await this.getDecryptedApiKey(userId);
    
    try {
      console.log('📊 Fetching HeyGen user quota...');
      
      const response = await axios.get(`${HEYGEN_API_BASE}/v2/user/remaining_quota`, {
        headers: {
          'X-Api-Key': apiKey,
        },
        timeout: 10000,
      });
      
      console.log('✅ HeyGen quota response:', JSON.stringify(response.data, null, 2));
      
      const isFreePlan = this.detectFreePlan(response.data);
      
      return {
        quota: response.data,
        isFreePlan,
      };
    } catch (error: any) {
      console.error('❌ Error fetching HeyGen quota:', error.response?.data || error.message);
      logger.error('Error fetching HeyGen quota', { error: error.message });
      
      // При ошибке считаем бесплатным планом для безопасности
      return {
        quota: null,
        isFreePlan: true,
      };
    }
  }

  /**
   * Определить бесплатный план по данным квоты
   * 
   * Логика определения:
   * 1. Если есть поле plan - используем его
   * 2. Если total_quota > 1000 кредитов - считаем платным планом
   * 3. По умолчанию - бесплатный план
   */
  private detectFreePlan(quotaData: any): boolean {
    try {
      console.log('🔍 Detecting plan from quota data:', JSON.stringify(quotaData, null, 2));
      
      // Вариант 1: Если есть поле plan
      if (quotaData?.data?.plan) {
        const plan = quotaData.data.plan.toLowerCase();
        const isFree = plan === 'free' || plan === 'trial' || plan === 'starter';
        console.log(`📋 Plan detected from field: ${plan} -> ${isFree ? 'FREE' : 'PAID'}`);
        return isFree;
      }
      
      // Вариант 2: Если есть total_quota - платные планы обычно имеют > 1000 кредитов
      if (quotaData?.data?.total_quota !== undefined) {
        const totalQuota = quotaData.data.total_quota;
        const isFree = totalQuota <= 1000;
        console.log(`💳 Plan detected from total_quota: ${totalQuota} -> ${isFree ? 'FREE' : 'PAID'}`);
        return isFree;
      }
      
      // Вариант 3: Если есть total_credits (старый формат)
      if (quotaData?.data?.total_credits !== undefined) {
        const totalCredits = quotaData.data.total_credits;
        const isFree = totalCredits < 200;
        console.log(`💰 Plan detected from total_credits: ${totalCredits} -> ${isFree ? 'FREE' : 'PAID'}`);
        return isFree;
      }
      
      // Вариант 4: Если есть только remaining - проверяем порог
      if (quotaData?.data?.remaining_quota !== undefined) {
        const remaining = quotaData.data.remaining_quota;
        const isFree = remaining < 100;
        console.log(`🔢 Plan detected from remaining_quota: ${remaining} -> ${isFree ? 'FREE' : 'PAID'}`);
        return isFree;
      }
      
      // По умолчанию считаем бесплатным для безопасности (720p)
      console.log('⚠️ Could not determine plan from quota data, defaulting to FREE');
      return true;
    } catch (error) {
      console.error('❌ Error detecting plan:', error);
      return true;
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
   * Сгенерировать WebM видео с прозрачным фоном (только студийные аватары)
   */
  async generateWebmVideo(userId: string, dto: GenerateWebmVideoDto) {
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.info("Generating HeyGen WebM video (transparent bg)", {
      userId,
      avatarId: dto.avatarId,
      mode: dto.audioUrl ? "audio" : "text",
    });

    try {
      const payload: Record<string, any> = {
        avatar_pose_id: dto.avatarId,
        avatar_style: dto.avatarStyle || "normal",
      };

      if (dto.audioUrl) {
        const isRemoteUrl = /^https?:\/\//i.test(dto.audioUrl);
        let audioAssetId: string;

        if (isRemoteUrl) {
          audioAssetId = await this.uploadAudioFromUrlToHeyGen(decryptedKey, dto.audioUrl);
        } else {
          const audioPath = dto.audioUrl.startsWith("/")
            ? dto.audioUrl
            : path.join(process.cwd(), dto.audioUrl);
          audioAssetId = await this.uploadAudioToHeyGen(decryptedKey, audioPath);
        }

        payload.input_audio = audioAssetId;
      } else {
        payload.input_text = dto.script;
        payload.voice_id = dto.voiceId;
      }

      if (dto.dimension) {
        payload.dimension = dto.dimension;
      }

      console.log("🎬 Generating WebM video with transparent background...");
      console.log("📦 Payload:", JSON.stringify(payload, null, 2));

      const response = await axios.post(`${HEYGEN_API_BASE}/v1/video.webm`, payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Api-Key": decryptedKey,
        },
        timeout: 30000,
      });

      const videoId = response.data?.data?.video_id;
      if (!videoId) {
        console.error("❌ No video_id in WebM response:", response.data);
        throw new Error("No video_id returned from HeyGen WebM endpoint");
      }

      console.log(`✅ WebM video generation started: ${videoId}`);
      return { videoId };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = errorData?.message || error.message;

        console.error("❌ HeyGen WebM API error:", { status: statusCode, data: errorData });

        if (statusCode === 400 && errorMessage?.includes("does not support WebM")) {
          throw new HeygenGenerateVideoError(
            "Этот аватар не поддерживает WebM формат. Используйте режим зелёного экрана.",
            400,
            errorMessage,
          );
        }

        throw new HeygenGenerateVideoError(
          errorMessage || "Failed to generate WebM video",
          statusCode || 500,
          errorMessage,
        );
      }
      throw error;
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
