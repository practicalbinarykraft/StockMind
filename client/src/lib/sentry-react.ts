import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for error tracking in the browser
 */
export function initSentry() {
  // Only initialize Sentry in production
  if (import.meta.env.MODE === "production" && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 0.1, // Capture 10% of transactions
      // Session Replay
      replaysSessionSampleRate: 0.1, // Sample 10% of sessions
      replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
      // Environment
      environment: import.meta.env.MODE,
    });
  } else {
    console.log("[Sentry] Disabled in development mode");
  }
}
