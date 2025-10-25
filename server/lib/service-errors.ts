/**
 * Custom Error Types for External Services
 * Provides structured error handling with context preservation
 */

export interface ServiceErrorDetails {
  service: string;
  statusCode?: number;
  apiMessage?: string;
  originalError?: any;
  context?: Record<string, any>;
}

/**
 * Base class for external service errors
 */
export class ServiceError extends Error {
  public readonly service: string;
  public readonly statusCode?: number;
  public readonly apiMessage?: string;
  public readonly originalError?: any;
  public readonly context?: Record<string, any>;

  constructor(message: string, details: ServiceErrorDetails) {
    super(message);
    this.name = 'ServiceError';
    this.service = details.service;
    this.statusCode = details.statusCode;
    this.apiMessage = details.apiMessage;
    this.originalError = details.originalError;
    this.context = details.context;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      service: this.service,
      statusCode: this.statusCode,
      apiMessage: this.apiMessage,
      context: this.context,
    };
  }
}

/**
 * API-related errors (authentication, rate limits, invalid requests)
 */
export class ApiError extends ServiceError {
  constructor(message: string, details: ServiceErrorDetails) {
    super(message, details);
    this.name = 'ApiError';
  }
}

/**
 * Network-related errors (timeouts, connection failures)
 */
export class NetworkError extends ServiceError {
  constructor(message: string, details: ServiceErrorDetails) {
    super(message, details);
    this.name = 'NetworkError';
  }
}

/**
 * Validation errors (invalid input, missing required fields)
 */
export class ValidationError extends ServiceError {
  constructor(message: string, details: ServiceErrorDetails) {
    super(message, details);
    this.name = 'ValidationError';
  }
}

/**
 * File operation errors (download failures, invalid files)
 */
export class FileOperationError extends ServiceError {
  constructor(message: string, details: ServiceErrorDetails) {
    super(message, details);
    this.name = 'FileOperationError';
  }
}

/**
 * Helper to determine if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) {
    // Retry on 5xx server errors and 429 rate limit
    const code = error.statusCode;
    return code === 429 || (code !== undefined && code >= 500 && code < 600);
  }
  return false;
}

/**
 * Helper to extract error details from various error formats
 */
export function extractErrorDetails(error: any): {
  message: string;
  statusCode?: number;
  apiMessage?: string;
} {
  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: (error as any).statusCode || (error as any).status,
      apiMessage: (error as any).apiMessage || (error as any).response?.data?.message,
    };
  }

  // Handle axios-style errors
  if (error.response) {
    return {
      message: error.response.data?.message || error.message || 'API request failed',
      statusCode: error.response.status,
      apiMessage: error.response.data?.message || error.response.statusText,
    };
  }

  // Handle fetch-style errors
  if (error.status) {
    return {
      message: error.statusText || error.message || 'Request failed',
      statusCode: error.status,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return { message: error };
  }

  // Fallback
  return {
    message: 'Unknown error occurred',
  };
}
