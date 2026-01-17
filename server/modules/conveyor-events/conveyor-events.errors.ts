/**
 * Conveyor Events Domain Errors
 */

export class EventHistoryFetchError extends Error {
  constructor() {
    super("Failed to fetch event history");
  }
}
