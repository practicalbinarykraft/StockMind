/**
 * Conveyor Status Domain Errors
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
