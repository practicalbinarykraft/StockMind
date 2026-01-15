/**
 * HeyGen Domain Errors
 * Бизнес-исключения без HTTP-кодов
 */

export class HeygenApiKeyNotFoundError extends Error {
  constructor() {
    super("No HeyGen API key configured. Please add your API key in Settings.");
  }
}

export class HeygenFetchAvatarsError extends Error {
  constructor(message: string = "Failed to fetch avatars") {
    super(message);
  }
}

export class HeygenGenerateVideoError extends Error {
  public statusCode?: number;
  public apiMessage?: string;

  constructor(message: string = "Failed to generate HeyGen video", statusCode?: number, apiMessage?: string) {
    super(message);
    this.statusCode = statusCode;
    this.apiMessage = apiMessage;
  }
}

export class HeygenVideoStatusError extends Error {
  public statusCode?: number;
  public apiMessage?: string;

  constructor(message: string = "Failed to check video status", statusCode?: number, apiMessage?: string) {
    super(message);
    this.statusCode = statusCode;
    this.apiMessage = apiMessage;
  }
}

export class ProxyDomainNotAllowedError extends Error {
  constructor(hostname: string) {
    super(`Domain not allowed for proxying: ${hostname}`);
  }
}

export class ProxyRateLimitError extends Error {
  constructor() {
    super("Too many concurrent image requests, please try again");
  }
}

export class ProxyTimeoutError extends Error {
  constructor(type: "image" | "video") {
    super(`${type === "image" ? "Image" : "Video"} fetch timeout`);
  }
}

export class ProxyNotFoundError extends Error {
  constructor(type: "image" | "video") {
    super(`${type === "image" ? "Image" : "Video"} not found`);
  }
}
