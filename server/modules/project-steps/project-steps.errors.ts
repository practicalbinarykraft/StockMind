/**
 * Project Steps Domain Errors
 * Бизнес-исключения без HTTP-кодов
 */

export class ProjectStepNotFoundError extends Error {
  constructor() {
    super("Project step not found");
  }
}

export class InvalidStepNumberError extends Error {
  constructor(message: string = "Invalid step number") {
    super(message);
  }
}

export class StepNotSkippableError extends Error {
  constructor(stepNumber: number) {
    super(`Only Voice Generation (4) and Avatar Selection (5) stages can be skipped. Provided: ${stepNumber}`);
  }
}

export class StepNotCurrentError extends Error {
  constructor(message: string = "Can only skip the current stage or previously completed stages") {
    super(message);
  }
}
