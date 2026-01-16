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
 * Types and interfaces
 */
interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
  speed?: number;
}

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
}

interface TextToSpeechRequest {
  text: string;
  model_id?: string;
  voice_settings?: VoiceSettings;
  output_format?: string;
  language_code?: string;
}

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

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
   * Fetch available voices from ElevenLabs API
   */
  private async fetchVoicesFromAPI(apiKey: string): Promise<Voice[]> {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.voices || [];
  }

  /**
   * Generate speech audio from text using ElevenLabs API
   */
  private async generateSpeechFromAPI(
    apiKey: string,
    voiceId: string,
    text: string,
    options?: Partial<TextToSpeechRequest>
  ): Promise<Buffer> {
    const requestBody: TextToSpeechRequest = {
      text,
      model_id: options?.model_id || "eleven_v3",
      voice_settings: options?.voice_settings || {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      },
      output_format: options?.output_format || "mp3_44100_128",
      language_code: options?.language_code,
    };

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS error: ${response.status} - ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Получить список доступных голосов
   */
  async fetchVoices(userId: string) {
    const decryptedKey = await this.getDecryptedApiKey(userId);

    logger.debug("Fetching ElevenLabs voices", { userId });

    try {
      const voices = await this.fetchVoicesFromAPI(decryptedKey);
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
      const audioBuffer = await this.generateSpeechFromAPI(decryptedKey, voiceId, text, {
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
