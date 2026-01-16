/**
 * Domain errors for Version Comparison module
 * Business exceptions without HTTP codes
 */

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
  }
} // дубликат

export class VersionNotFoundError extends Error {
  constructor() {
    super('Version not found');
  }
} // дубликат

export class MissingCurrentVersionError extends Error {
  constructor() {
    super('Missing current version');
  }
}

export class MissingCandidateVersionError extends Error {
  constructor() {
    super('Missing candidate version');
  }
}

export class InvalidChoiceError extends Error {
  constructor() {
    super("keep must be 'base' or 'candidate'");
  }
}

export class NoCandidateVersionError extends Error {
  constructor() {
    super('No candidate version found');
  }
}
