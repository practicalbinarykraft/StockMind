// Доменные ошибки для модуля projects-script
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

export class FormatIdRequiredError extends Error {
  constructor() {
    super('formatId is required');
  }
}

export class NoScenesGeneratedError extends Error {
  code: string;
  suggestions: string[];
  
  constructor() {
    super('AI не смог создать сценарий');
    this.code = 'NO_SCENES';
    this.suggestions = [
      'Попробуйте другой формат видео',
      'Упростите исходный контент',
      'Повторите попытку через несколько секунд'
    ];
  }
}

export class ScriptGenerationError extends Error {
  constructor(message?: string) {
    super(message || 'Failed to generate script');
  }
}
