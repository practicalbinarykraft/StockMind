/**
 * Domain errors for Reanalysis module
 * Business exceptions without HTTP codes
 */

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
  }
} // дубликат

export class NoCurrentVersionError extends Error {
  constructor() {
    super('No current version found');
  }
} // дубликат

export class NoApiKeyConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} API key not configured`);
  }
} // дубликат

export class JobNotFoundError extends Error {
  constructor() {
    super('Job not found');
  }
}

export class ReanalysisAlreadyRunningError extends Error {
  public jobId: string;
  public status: string;

  constructor(jobId: string, status: string) {
    super('Reanalysis already in progress');
    this.jobId = jobId;
    this.status = status;
  }
}
