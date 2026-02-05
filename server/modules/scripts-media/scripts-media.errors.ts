// ============================================================================
// Custom errors для scripts-media
// ============================================================================

export class ScriptMediaNotFoundError extends Error {
  constructor() {
    super('Script media not found');
    this.name = 'ScriptMediaNotFoundError';
  }
}

export class ScriptMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScriptMediaValidationError';
  }
}
