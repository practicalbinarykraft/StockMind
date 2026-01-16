/**
 * Auto Scripts Domain Errors
 * Business exceptions without HTTP codes
 */

export class AutoScriptNotFoundError extends Error {
  constructor() {
    super("Script not found");
  }
} // дубликат

export class AutoScriptAccessDeniedError extends Error {
  constructor() {
    super("Access denied");
  }
}

export class InvalidScriptStatusError extends Error {
  constructor(status: string) {
    super(`Script is already ${status}`);
  }
}

export class MaxRevisionsReachedError extends Error {
  constructor(maxRevisions: number) {
    super(
      `Maximum revision limit (${maxRevisions}) reached. Script has been rejected.`
    );
  }
}

export class RevisionNotStuckError extends Error {
  constructor() {
    super("Script is not stuck in revision");
  }
}

export class NoApiKeyConfiguredError extends Error {
  constructor() {
    super("No Anthropic API key configured");
  }
} // дубликат
