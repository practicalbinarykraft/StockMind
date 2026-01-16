/**
 * Conveyor Settings Domain Errors
 * Business exceptions without HTTP codes
 */

export class SettingsNotFoundError extends Error {
  constructor() {
    super("Conveyor settings not found");
  }
}

export class DailyLimitExceededError extends Error {
  constructor(limit: number, current: number) {
    super(`Daily limit exceeded: ${current}/${limit} items processed today`);
  }
}

export class MonthlyBudgetExceededError extends Error {
  constructor(limit: string, current: string) {
    super(`Monthly budget exceeded: $${current}/$${limit}`);
  }
}
