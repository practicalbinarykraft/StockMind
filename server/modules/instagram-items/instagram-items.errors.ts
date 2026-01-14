export class InstagramItemNotFoundError extends Error {
  constructor() {
    super("Instagram item not found");
  }
}

export class InvalidActionError extends Error {
  constructor() {
    super("Invalid action. Must be one of: selected, dismissed, seen");
  }
}

export class VideoNotDownloadedError extends Error {
  constructor(downloadStatus?: string) {
    super(
      `Video must be downloaded before transcription. Current status: ${downloadStatus || "pending"}`
    );
  }
}

export class TranscriptionNotCompletedError extends Error {
  constructor(transcriptionStatus?: string) {
    super(
      `Transcription must be completed before AI scoring. Current status: ${transcriptionStatus || "pending"}`
    );
  }
}

export class InvalidProxyUrlError extends Error {
  constructor() {
    super("Invalid URL - must be from Instagram CDN");
  }
}

export class ProxyImageFetchError extends Error {
  constructor(status: number) {
    super(`Failed to fetch image from Instagram CDN. Status: ${status}`);
  }
}
