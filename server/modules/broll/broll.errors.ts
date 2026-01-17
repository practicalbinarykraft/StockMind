/**
 * B-Roll Domain Errors
 * Бизнес-исключения без HTTP-кодов
 */

export class AnthropicApiKeyNotFoundError extends Error {
  constructor() {
    super("Anthropic API key not configured. Please add it in Settings.");
  }
}

export class KieaiApiKeyNotFoundError extends Error {
  constructor() {
    super("Kie.ai API key not configured. Please add it in Settings.");
  }
}

export class GeneratePromptError extends Error {
  constructor(message: string = "Failed to generate AI prompt") {
    super(message);
  }
}

export class GenerateBrollError extends Error {
  public statusCode?: number;
  public apiMessage?: string;

  constructor(message: string = "Failed to generate B-Roll video", statusCode?: number, apiMessage?: string) {
    super(message);
    this.statusCode = statusCode;
    this.apiMessage = apiMessage;
  }
}

export class BrollStatusError extends Error {
  public statusCode?: number;
  public apiMessage?: string;

  constructor(message: string = "Failed to check video status", statusCode?: number, apiMessage?: string) {
    super(message);
    this.statusCode = statusCode;
    this.apiMessage = apiMessage;
  }
}
