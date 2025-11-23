import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import type { Express } from 'express';

/**
 * Sentry error monitoring setup
 * Tracks errors and performance in production
 */

export function setupSentry(app: Express) {
  // Only enable Sentry if DSN is provided
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('[Sentry] No SENTRY_DSN found, error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Release tracking
    release: process.env.REPL_SLUG || 'unknown',

    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send authentication errors (they're expected)
      if (event.exception?.values?.[0]?.type === 'UnauthorizedError') {
        return null;
      }

      // Scrub sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      return event;
    },

    // Don't capture user IP addresses
    sendDefaultPii: false,

    // Integration configuration
    integrations: [
      nodeProfilingIntegration(),
    ]
  });

  // Request handler must be first
  app.use(Sentry.setupExpressErrorHandler(app));

  console.log('[Sentry] Error monitoring initialized');
}

/**
 * Error handler middleware - must be added after all routes
 */
export function sentryErrorHandler() {
  return (err: any, req: any, res: any, next: any) => {
    // Let Sentry capture the error
    Sentry.captureException(err);
    next(err);
  };
}

/**
 * Manually capture errors
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context
  });
}

/**
 * Capture message/warning
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add user context to errors
 */
export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}
