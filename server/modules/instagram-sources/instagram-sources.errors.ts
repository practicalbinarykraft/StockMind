export class InstagramSourceNotFoundError extends Error {
  constructor() {
    super("Instagram source not found");
  }
}

export class ApifyKeyNotConfiguredError extends Error {
  constructor() {
    super("Apify API key not configured. Please add it in Settings.");
  }
}

export class InvalidApifyKeyError extends Error {
  constructor() {
    super("Invalid Apify API key. Please check your credentials in Settings.");
  }
}

export class InstagramParseError extends Error {
  constructor(message: string) {
    super(message);
  }
}
