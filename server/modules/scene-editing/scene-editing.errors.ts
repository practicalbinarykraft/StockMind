/**
 * Domain errors for Scene Editing module
 * Business exceptions without HTTP codes
 */

export class ScriptVersionNotFoundError extends Error {
  constructor() {
    super('Script version not found');
  }
} // дубликат

export class RecommendationNotFoundError extends Error {
  constructor() {
    super('Recommendation not found');
  }
}

export class SceneNotFoundError extends Error {
  constructor() {
    super('Scene not found');
  }
}

export class NoApiKeyConfiguredError extends Error {
  constructor(provider: string) {
    super(`No ${provider} API key configured`);
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
  }
} // дубликат
