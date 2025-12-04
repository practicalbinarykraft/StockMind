import * as Sentry from '@sentry/react';

/**
 * Sentry error tracking for React
 * Captures unhandled errors in the frontend
 */

export function initSentry() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDsn) {
    // Silently skip Sentry initialization in development
    // Set VITE_SENTRY_DSN in production to enable error monitoring
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filter noise
    beforeSend(event, hint) {
      // Don't send 404 errors
      if (event.message?.includes('404')) {
        return null;
      }

      // Don't send network errors (they're expected)
      if (hint.originalException instanceof TypeError &&
          hint.originalException.message.includes('fetch')) {
        return null;
      }

      return event;
    },

    // Don't send PII
    sendDefaultPii: false,
  });

  console.log('[Sentry] Frontend error monitoring initialized');
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string) {
  Sentry.setUser({ id: userId });
}

/**
 * Clear user context on logout
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Manually capture errors
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context
  });
}
