/**
 * Conveyor Trigger Domain Errors
 */

export class ConveyorItemNotFoundError extends Error {
  constructor() {
    super("Conveyor item not found");
  }
}

export class ConveyorItemAccessDeniedError extends Error {
  constructor() {
    super("Access denied to conveyor item");
  }
}

export class ItemNotFailedError extends Error {
  constructor(status: string) {
    super(`Item is not failed (status: ${status})`);
  }
}

export class MaxRetryLimitReachedError extends Error {
  constructor(limit: number) {
    super(`Maximum retry limit reached (${limit})`);
  }
}

export class SourceDataNotFoundError extends Error {
  constructor() {
    super("Source data not found for retry");
  }
}
