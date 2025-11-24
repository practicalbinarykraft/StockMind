import helmet from 'helmet';
import cors from 'cors';
import type { Express } from 'express';
import { logger } from '../lib/logger';

/**
 * Security middleware configuration
 * Implements CORS, CSP, and other security headers
 */

export function setupSecurity(app: Express) {
  // CORS configuration
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Get allowed origins from environment variable
      // Format: comma-separated list, e.g., "https://example.com,https://www.example.com"
      const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
      const allowedOrigins: (string | RegExp)[] = allowedOriginsEnv
        .split(',')
        .map(o => o.trim())
        .filter(o => o.length > 0);

      // In development, always allow localhost
      if (process.env.NODE_ENV !== 'production') {
        allowedOrigins.push('http://localhost:5173');
        allowedOrigins.push('http://localhost:5000');
      }

      // If no origins configured and in production, FAIL SECURE
      if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
        // CRITICAL: ALLOWED_ORIGINS must be configured in production
        const error = new Error(
          'CORS: ALLOWED_ORIGINS environment variable is required in production. ' +
          'Set it to comma-separated list of allowed domains (e.g., "https://example.com,https://www.example.com")'
        );
        console.error('[Security] CRITICAL:', error.message);
        return callback(error);
      }

      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed;
        }
        return allowed.test(origin);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400 // 24 hours
  };

  app.use(cors(corsOptions));

  // Helmet security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for Vite in dev
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https://api.anthropic.com', 'https://api.openai.com'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disabled for external API calls
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // Custom security headers
  app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter in older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    next();
  });
}
