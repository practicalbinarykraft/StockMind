import OpenAI from 'openai';
import fs from 'fs';
import { storage } from './storage';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  language?: string;
  error?: string;
}

/**
 * Transcribe Instagram Reel video using OpenAI Whisper API
 * @param localVideoPath - Path to the locally downloaded video file
 * @param userId - User ID to fetch OpenAI API key
 * @returns Transcription result with text and detected language
 */
export async function transcribeInstagramVideo(
  localVideoPath: string,
  userId: string
): Promise<TranscriptionResult> {
  try {
    console.log(`[Transcription] Starting transcription for: ${localVideoPath}`);

    // Get OpenAI API key from database
    const apiKeyRecord = await storage.getUserApiKey(userId, 'openai');
    if (!apiKeyRecord) {
      return {
        success: false,
        error: 'OpenAI API key not found. Please add it in Settings.',
      };
    }
    
    const apiKey = apiKeyRecord.encryptedKey; // Already decrypted by storage

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });
    
    // Create read stream from local video file
    // Note: Whisper can handle video files directly (extracts audio automatically)
    const audioReadStream = fs.createReadStream(localVideoPath);
    
    console.log(`[Transcription] Sending to OpenAI Whisper API...`);
    
    // Transcribe using Whisper
    // Note: Language is optional - Whisper auto-detects if not specified
    // We can specify response_format to get more info
    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      response_format: "verbose_json", // Returns language and other metadata
    });

    console.log(`[Transcription] Success!`);
    console.log(`[Transcription] Text length: ${transcription.text?.length || 0} characters`);

    return {
      success: true,
      text: transcription.text,
      language: (transcription as any).language || 'unknown', // language is in verbose_json format
    };
    
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`[Transcription] Error:`, errorMsg);
    
    return {
      success: false,
      error: `Transcription failed: ${errorMsg}`,
    };
  }
}

/**
 * Test OpenAI API key by attempting a simple transcription check
 * @param apiKey - OpenAI API key to test
 * @returns True if key is valid
 */
export async function testOpenAIApiKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey });
    
    // Try to list models to validate the key
    await openai.models.list();
    
    return true;
  } catch (error) {
    console.error('OpenAI API key test failed:', error);
    return false;
  }
}
