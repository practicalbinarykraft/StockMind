import winston from 'winston';

/**
 * Structured logging with Winston
 * Replaces console.log with proper log levels and formatting
 */

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  defaultMeta: { service: 'stockmind-api' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    // File output for development
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.File({
        filename: '/tmp/stockmind-dev.log',
        format: customFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      })
    ] : [])
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console()
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console()
  ]
});

/**
 * Express middleware for request logging
 */
export function requestLogger(req: any, res: any, next: any) {
  const start = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, 'Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}

/**
 * Helper to replace console.log calls
 * Use: logger.info(), logger.warn(), logger.error(), logger.debug()
 */

// Re-export common log methods for convenience
export const log = {
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger)
};
