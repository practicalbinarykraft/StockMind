// Доменные ошибки для модуля projects
// Бизнес-исключения без HTTP-кодов

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
  }
}

export class ProjectForbiddenError extends Error {
  constructor() {
    super('Access to this project is forbidden');
  }
}

export class InvalidStageError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class StageNavigationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class InstagramItemNotFoundError extends Error {
  constructor() {
    super('Instagram Reel not found or not authorized');
  }
}

export class InstagramItemAlreadyUsedError extends Error {
  projectId: string;
  
  constructor(projectId: string) {
    super('This Reel is already used in another project');
    this.projectId = projectId;
  }
}

export class InstagramTranscriptionRequiredError extends Error {
  constructor(status?: string) {
    super(`Reel must be transcribed before creating a project. Current status: ${status || 'pending'}`);
  }
}

export class NewsItemNotFoundError extends Error {
  constructor() {
    super('News item not found or not authorized');
  }
}

export class NewsItemAlreadyUsedError extends Error {
  projectId: string;
  
  constructor(projectId: string) {
    super('This news item is already used in another project');
    this.projectId = projectId;
  }
}

export class ScriptAlreadyUsedError extends Error {
  projectId: string;
  
  constructor(projectId: string) {
    super('This script is already used in another project');
    this.projectId = projectId;
  }
}

export class BatchCreateError extends Error {
  created: number;
  total: number;
  errors: Array<{ articleId: string; error: string }>;
  
  constructor(message: string, created: number, total: number, errors: Array<{ articleId: string; error: string }>) {
    super(message);
    this.created = created;
    this.total = total;
    this.errors = errors;
  }
}
