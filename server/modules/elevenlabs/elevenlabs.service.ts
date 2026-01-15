import { fetchVoices, generateSpeech } from "../../elevenlabs-service";
import { logger } from "../../lib/logger";
import { apiKeysService } from "../api-keys/api-keys.service";
import { ApiKeyNotFoundError } from "../api-keys/api-keys.errors";
import {
  ElevenlabsApiKeyNotFoundError,
  ElevenlabsFetchVoicesError,
  ElevenlabsGenerateSpeechError,
} from "./elevenlabs.errors";
import type { GenerateSpeechDto } from "./elevenlabs.dto";

/**
 * ElevenLabs Service
 * Бизнес-логика для работы с ElevenLabs API
 */
export class ElevenlabsService {
  /**
   * Получить расшифрованный ElevenLabs API ключ
   */
  private async getDecryptedApiKey(userId: string): Promise<string> {
    try {
      const apiKey = await apiKeysService.getUserApiKey(userId, "elevenlabs");
      return apiKey.decryptedKey;
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        throw new ElevenlabsApiKeyNotFoundError();
      }
      throw error;
    }
  }

  /**
   * Получить список доступных голосов
   */
  async fetchVoices(userId: string) {
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Fetching ElevenLabs voices", { userId });

    try {
      const voices = await fetchVoices(decryptedKey);
      return voices;
    } catch (error: any) {
      logger.error("Error fetching voices", { error: error.message });
      throw new ElevenlabsFetchVoicesError(error.message);
    }
  }

  /**
   * Сгенерировать речь из текста
   */
  async generateSpeech(userId: string, dto: GenerateSpeechDto) {
    const { voiceId, text, voiceSettings } = dto;
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.info("Generating ElevenLabs speech", { userId, voiceId });

    try {
      const audioBuffer = await generateSpeech(decryptedKey, voiceId, text, {
        voice_settings: voiceSettings,
      });

      // Return audio as base64 for easy frontend handling
      const audioBase64 = audioBuffer.toString("base64");

      return {
        audio: audioBase64,
        format: "mp3",
        size: audioBuffer.length,
      };
    } catch (error: any) {
      logger.error("Error generating speech", { error: error.message });
      throw new ElevenlabsGenerateSpeechError(error.message);
    }
  }
}

export const elevenlabsService = new ElevenlabsService();
