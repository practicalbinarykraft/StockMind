// ElevenLabs API Service for Voice Generation

interface VoiceSettings {
  stability: number
  similarity_boost: number
  style?: number
  use_speaker_boost?: boolean
  speed?: number
}

interface Voice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
  description?: string
  preview_url?: string
}

interface TextToSpeechRequest {
  text: string
  model_id?: string
  voice_settings?: VoiceSettings
  output_format?: string
  language_code?: string
}

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

/**
 * Fetch available voices from ElevenLabs
 */
export async function fetchVoices(apiKey: string): Promise<Voice[]> {
  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
    headers: {
      "xi-api-key": apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.voices || []
}

/**
 * Generate speech audio from text using ElevenLabs
 */
export async function generateSpeech(
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
  }

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs TTS error: ${response.status} - ${error}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Get available TTS models from ElevenLabs
 */
export async function fetchModels(apiKey: string) {
  const response = await fetch(`${ELEVENLABS_BASE_URL}/models`, {
    headers: {
      "xi-api-key": apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`)
  }

  return await response.json()
}
