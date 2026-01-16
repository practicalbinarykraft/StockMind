/**
 * Domain errors for Script Versions module
 * Business exceptions without HTTP codes
 */

export class ScriptVersionNotFoundError extends Error {
  constructor() {
    super('Script version not found');
  }
}

export class ScriptVersionInvalidError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class CannotDeleteCurrentVersionError extends Error {
  constructor() {
    super('Cannot delete current version');
  }
}

export class CanOnlyAcceptCandidateVersionsError extends Error {
  constructor() {
    super('Can only accept candidate versions');
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
  }
} // проверить на дубликат

export class VersionAlreadyExistsError extends Error {
  constructor() {
    super('Version already exists');
  }
}
