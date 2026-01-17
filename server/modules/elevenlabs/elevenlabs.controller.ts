import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { elevenlabsService } from "./elevenlabs.service";
import { GenerateSpeechDto } from "./elevenlabs.dto";
import {
  ElevenlabsApiKeyNotFoundError,
  ElevenlabsFetchVoicesError,
  ElevenlabsGenerateSpeechError,
} from "./elevenlabs.errors";

/**
 * ElevenLabs Controller
 * Обработка HTTP запросов для ElevenLabs
 */
export const elevenlabsController = {
  /**
   * GET /api/elevenlabs/voices
   * Получить список голосов
   */
  async getVoices(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const voices = await elevenlabsService.fetchVoices(userId);
      res.json(voices);
    } catch (error: any) {
      logger.error("Error fetching voices", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof ElevenlabsApiKeyNotFoundError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof ElevenlabsFetchVoicesError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to fetch voices" });
    }
  },

  /**
   * POST /api/elevenlabs/generate
   * Сгенерировать речь
   */
  async generateSpeech(req: Request, res: Response) {
    let userId: string | null = null;
    try {
      userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const validated = GenerateSpeechDto.parse(req.body);
      const result = await elevenlabsService.generateSpeech(userId, validated);

      res.json(result);
    } catch (error: any) {
      logger.error("Error generating speech", {
        userId,
        errorType: error.constructor?.name,
      });

      if (error instanceof ElevenlabsApiKeyNotFoundError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof ElevenlabsGenerateSpeechError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to generate speech" });
    }
  },
};
