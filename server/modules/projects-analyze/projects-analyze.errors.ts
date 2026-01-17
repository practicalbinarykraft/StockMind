// Доменные ошибки для модуля projects-analyze
// Бизнес-исключения без HTTP-кодов

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
  }
}

export class NoContentFoundError extends Error {
  constructor() {
    super('No content found in project. Please ensure content is available.');
  }
}

export class ApiKeyNotConfiguredError extends Error {
  constructor(provider: string = 'Anthropic') {
    super(`${provider} API key not configured. Please add it in Settings.`);
  }
}

export class AnalysisFailedError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to analyze source content');
  }
}
