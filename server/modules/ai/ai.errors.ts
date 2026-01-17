/**
 * AI Service Domain Errors
 * Бизнес-исключения без HTTP-кодов
 */

export class AnthropicApiKeyNotFoundError extends Error {
  constructor() {
    super("No Anthropic API key configured. Please add your API key in Settings.");
  }
}

export class InvalidAnthropicApiKeyError extends Error {
  constructor() {
    super("Invalid Anthropic API key. Please verify your API key in Settings is correct.");
  }
}

export class AiAnalysisError extends Error {
  constructor(message: string = "Failed to analyze with AI") {
    super(message);
  }
}
