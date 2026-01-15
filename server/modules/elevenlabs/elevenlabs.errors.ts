/**
 * ElevenLabs Domain Errors
 * Бизнес-исключения без HTTP-кодов
 */

export class ElevenlabsApiKeyNotFoundError extends Error {
  constructor() {
    super("No ElevenLabs API key configured. Please add your API key in Settings.");
  }
}

export class ElevenlabsFetchVoicesError extends Error {
  constructor(message: string = "Failed to fetch voices") {
    super(message);
  }
}

export class ElevenlabsGenerateSpeechError extends Error {
  constructor(message: string = "Failed to generate speech") {
    super(message);
  }
}
