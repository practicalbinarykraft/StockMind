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
 * Validate video file before transcription
 */
async function validateVideoFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        error: `Video file not found: ${filePath}`,
      };
    }

    // Check if file is readable
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return {
        valid: false,
        error: `Video file is not readable: ${filePath}`,
      };
    }

    // Check file size (should be > 0 and < 25MB - Whisper limit)
    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      return {
        valid: false,
        error: 'Video file is empty',
      };
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `Video file is too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: 25MB)`,
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: `File validation error: ${error.message}`,
    };
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  // Network errors
  if (errorCode === 'ECONNRESET' || errorCode === 'ETIMEDOUT' || errorCode === 'ENOTFOUND') {
    return true;
  }
  
  // API rate limits or temporary issues
  if (errorMessage.includes('rate limit') || 
      errorMessage.includes('timeout') ||
      errorMessage.includes('503') ||
      errorMessage.includes('502') ||
      errorMessage.includes('500')) {
    return true;
  }
  
  return false;
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Transcribe Instagram Reel video using OpenAI Whisper API with retry logic
 * @param localVideoPath - Path to the locally downloaded video file
 * @param userId - User ID to fetch OpenAI API key
 * @returns Transcription result with text and detected language
 */
export async function transcribeInstagramVideo(
  localVideoPath: string,
  userId: string
): Promise<TranscriptionResult> {
  const maxAttempts = 3;
  const baseDelay = 1000; // 1 second
  
  console.log(`[Transcription] Starting transcription for: ${localVideoPath}`);

  // Get OpenAI API key from database
  const apiKeyRecord = await storage.getUserApiKey(userId, 'openai');
  if (!apiKeyRecord) {
    return {
      success: false,
      error: 'OpenAI API key not found. Please add it in Settings.',
    };
  }
  
  const apiKey = apiKeyRecord.decryptedKey; // Decrypted value from storage

  // Validate video file before attempting transcription
  const validation = await validateVideoFile(localVideoPath);
  if (!validation.valid) {
    console.error(`[Transcription] File validation failed: ${validation.error}`);
    return {
      success: false,
      error: validation.error,
    };
  }

  console.log(`[Transcription] File validated successfully`);

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey });

  // Retry loop with exponential backoff
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Transcription] Attempt ${attempt}/${maxAttempts} - Sending to OpenAI Whisper API...`);
      
      // Create fresh read stream for each attempt
      const audioReadStream = fs.createReadStream(localVideoPath);
      
      // Transcribe using Whisper
      // Note: Language is optional - Whisper auto-detects if not specified
      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
        response_format: "verbose_json", // Returns language and other metadata
      });

      console.log(`[Transcription] ✅ Success on attempt ${attempt}!`);
      console.log(`[Transcription] Text length: ${transcription.text?.length || 0} characters`);

      return {
        success: true,
        text: transcription.text,
        language: (transcription as any).language || 'unknown',
      };
      
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || String(error);
      console.error(`[Transcription] ❌ Attempt ${attempt}/${maxAttempts} failed:`, errorMsg);
      
      // If this is the last attempt or error is not retryable, break
      if (attempt === maxAttempts || !isRetryableError(error)) {
        console.error(`[Transcription] Giving up after ${attempt} attempt(s)`);
        break;
      }
      
      // Calculate exponential backoff delay: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[Transcription] Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All attempts failed
  const finalError = lastError?.message || String(lastError);
  return {
    success: false,
    error: `Transcription failed after ${maxAttempts} attempts: ${finalError}`,
  };
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
