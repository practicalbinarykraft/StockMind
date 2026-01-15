/**
 * News Analysis Domain Errors
 * 
 * Бизнес-исключения для модуля анализа новостей.
 * Не содержат HTTP-коды - это ответственность controller.
 */

export class AnthropicApiKeyNotFoundError extends Error {
  constructor() {
    super("Anthropic API key not configured");
  }
}

export class ArticleNotFoundError extends Error {
  constructor(articleId: string) {
    super(`Article ${articleId} not found`);
  }
}

export class TranslationTextRequiredError extends Error {
  constructor() {
    super("Text is required for translation");
  }
}

export class AnalysisDataRequiredError extends Error {
  constructor() {
    super("Title and content are required for analysis");
  }
}

export class BatchArticlesRequiredError extends Error {
  constructor() {
    super("Articles array is required for batch analysis");
  }
}

export class TranslationFailedError extends Error {
  constructor(originalError?: string) {
    super(`Failed to translate text: ${originalError || "Unknown error"}`);
  }
}

export class AnalysisFailedError extends Error {
  constructor(originalError?: string) {
    super(`Failed to analyze article: ${originalError || "Unknown error"}`);
  }
}

export class BatchAnalysisFailedError extends Error {
  constructor(originalError?: string) {
    super(`Failed to analyze articles in batch: ${originalError || "Unknown error"}`);
  }
}

export class ArticleUpdateFailedError extends Error {
  constructor(articleId: string, field: string) {
    super(`Failed to save ${field} for article ${articleId}`);
  }
}
