/**
 * Domain errors for Scripts Library module
 * Business exceptions without HTTP codes
 */

export class ScriptNotFoundError extends Error {
  constructor() {
    super('Script not found');
  }
}

export class ScriptValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class NoApiKeyConfiguredError extends Error {
  constructor(provider: string) {
    super(`No ${provider} API key configured`);
  }
}// дубликат

export class ArticleNotFoundError extends Error {
  constructor() {
    super('Article not found');
  }
}
