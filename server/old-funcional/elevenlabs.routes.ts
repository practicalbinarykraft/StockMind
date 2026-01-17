import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { fetchVoices, generateSpeech } from "./elevenlabs-service";
import { logger } from "../lib/logger";

/**
 * ElevenLabs Voice Generation routes
 * Handles voice listing and speech generation using ElevenLabs API
 */
export function registerElevenlabsRoutes(app: Express) {
  /**
   * GET /api/elevenlabs/voices
   * Fetches available voices from ElevenLabs
   * Requires: ElevenLabs API key
   */
  app.get("/api/elevenlabs/voices", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Get user's ElevenLabs API key
      const apiKey = await storage.getUserApiKey(userId, 'elevenlabs');
      if (!apiKey) {
        return res.status(400).json({
          message: "No ElevenLabs API key configured. Please add your API key in Settings."
        });
      }

      logger.debug("Fetching ElevenLabs voices", { userId });
      const voices = await fetchVoices(apiKey.decryptedKey);

      res.json(voices);
    } catch (error: any) {
      logger.error("Error fetching voices", { error: error.message });
      res.status(500).json({ message: "Failed to fetch voices" });
    }
  });

  /**
   * POST /api/elevenlabs/generate
   * Generates speech from text using ElevenLabs
   * Requires: ElevenLabs API key
   * Body: { voiceId, text, voiceSettings? }
   * Returns: Base64-encoded audio data
   */
  app.post("/api/elevenlabs/generate", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { voiceId, text, voiceSettings } = req.body;

      if (!voiceId || !text) {
        return res.status(400).json({ message: "Voice ID and text are required" });
      }

      // Get user's ElevenLabs API key
      const apiKey = await storage.getUserApiKey(userId, 'elevenlabs');
      if (!apiKey) {
        return res.status(400).json({
          message: "No ElevenLabs API key configured. Please add your API key in Settings."
        });
      }

      logger.info("Generating ElevenLabs speech", { userId, voiceId });
      const audioBuffer = await generateSpeech(apiKey.decryptedKey, voiceId, text, {
        voice_settings: voiceSettings,
      });

      // Return audio as base64 for easy frontend handling
      const audioBase64 = audioBuffer.toString('base64');
      res.json({
        audio: audioBase64,
        format: 'mp3',
        size: audioBuffer.length
      });
    } catch (error: any) {
      logger.error("Error generating speech", { error: error.message });
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });
}
