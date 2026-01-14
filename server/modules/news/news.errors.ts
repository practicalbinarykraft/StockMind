/**
 * Доменные ошибки модуля News
 * 
 * Используются в service для генерации ошибок,
 * обрабатываются в controller.
 */

export class NewsItemNotFoundError extends Error {
  constructor() {
    super('News item not found');
  }
}

export class NewsItemAlreadyExistsError extends Error {
  constructor() {
    super('News item with this URL already exists for this source');
  }
}

export class ArticleContentFetchError extends Error {
  constructor(public reason: string) {
    super(`Failed to fetch article content: ${reason}`);
  }
}

export class ArticleAnalysisNotFoundError extends Error {
  constructor() {
    super('No saved analysis found for this article');
  }
}

export class InvalidActionError extends Error {
  constructor(action: string) {
    super(`Invalid action: ${action}. Must be one of: selected, dismissed, seen`);
  }
}

export class BatchScoringError extends Error {
  constructor(message: string) {
    super(`Batch scoring failed: ${message}`);
  }
}

export class RefreshNewsError extends Error {
  constructor(message: string) {
    super(`Failed to refresh news: ${message}`);
  }
}
