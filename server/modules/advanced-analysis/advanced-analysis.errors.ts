/**
 * Advanced Analysis Domain Errors
 * Бизнес-исключения без HTTP-кодов
 */

export class AnthropicApiKeyNotFoundError extends Error {
  constructor() {
    super("Anthropic API key not configured. Please add it in Settings.");
  }
}

export class AdvancedAnalysisError extends Error {
  constructor(message: string = "Failed to perform advanced analysis") {
    super(message);
  }
}

export class ComparisonError extends Error {
  constructor(message: string = "Failed to compare analysis systems") {
    super(message);
  }
}
