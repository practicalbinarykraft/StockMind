/**
 * Audio Upload Domain Errors
 * Бизнес-исключения без HTTP-кодов
 */

export class NoAudioFileError extends Error {
  constructor() {
    super("No audio file uploaded");
  }
}

export class AudioUploadError extends Error {
  constructor(message: string = "Failed to upload audio") {
    super(message);
  }
}

export class InvalidAudioFileError extends Error {
  constructor(message: string = "Invalid file type. Only MP3, WAV, and M4A are allowed.") {
    super(message);
  }
}
