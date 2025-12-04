import rateLimit from 'express-rate-limit';

/**
 * Rate limiting configuration for production
 * Protects API endpoints from abuse and DDoS attacks
 */

// General API rate limiter - 100 requests per 15 minutes per IP
// In development, allow more requests for testing
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Much more lenient in development
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});

// Strict rate limiter for expensive AI operations - 10 requests per hour
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'AI analysis rate limit exceeded',
    retryAfter: '1 hour',
    tip: 'AI operations are rate-limited to prevent abuse and manage costs'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth rate limiter - 5 login attempts per 15 minutes
// In development, allow more attempts for testing
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 200 : 5, // Much more lenient in development
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful auth
});

// File upload limiter - 20 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Upload rate limit exceeded',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});
