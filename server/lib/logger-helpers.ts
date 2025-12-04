import { logger } from './logger';

/**
 * Logger Helper Utilities
 * Centralized logging functions for common patterns
 */

interface RequestContext {
  method?: string;
  url?: string;
  userId?: string;
  statusCode?: number;
  duration?: string;
}

interface BackgroundTaskContext {
  taskName: string;
  status: 'started' | 'completed' | 'failed';
  duration?: number;
  itemsProcessed?: number;
  error?: any;
  // Allow additional context properties
  [key: string]: any;
}

interface ServiceCallContext {
  service: string;
  operation: string;
  duration?: number;
  error?: any;
  [key: string]: any;
}

/**
 * Log API request
 */
export function logApiRequest(context: RequestContext) {
  logger.info('API request', context);
}

/**
 * Log API response
 */
export function logApiResponse(context: RequestContext) {
  const level = context.statusCode && context.statusCode >= 400 ? 'warn' : 'info';
  logger[level]('API response', context);
}

/**
 * Log API error
 */
export function logApiError(error: Error, context: any = {}) {
  logger.error('API error', {
    message: error.message,
    stack: error.stack,
    ...context
  });
}

/**
 * Log background task event
 */
export function logBackgroundTask(context: BackgroundTaskContext) {
  const { status, error, ...rest } = context;

  if (status === 'failed' && error) {
    logger.error(`Background task failed: ${context.taskName}`, {
      ...rest,
      error: error.message,
      stack: error.stack
    });
  } else if (status === 'completed') {
    logger.info(`Background task completed: ${context.taskName}`, rest);
  } else {
    logger.info(`Background task started: ${context.taskName}`, rest);
  }
}

/**
 * Log external service call
 */
export function logServiceCall(context: ServiceCallContext) {
  const { error, ...rest } = context;

  if (error) {
    logger.error(`Service call failed: ${context.service}.${context.operation}`, {
      ...rest,
      error: error.message,
      stack: error.stack
    });
  } else {
    logger.info(`Service call: ${context.service}.${context.operation}`, rest);
  }
}

/**
 * Log database operation
 */
export function logDbOperation(operation: string, table: string, context: any = {}) {
  logger.debug('Database operation', {
    operation,
    table,
    ...context
  });
}

/**
 * Log validation error
 */
export function logValidationError(errors: any, context: any = {}) {
  logger.warn('Validation error', {
    errors,
    ...context
  });
}

/**
 * Log cron job
 */
export function logCronJob(jobName: string, status: 'started' | 'completed' | 'failed', context: any = {}) {
  const level = status === 'failed' ? 'error' : 'info';
  logger[level](`Cron job ${status}: ${jobName}`, context);
}

/**
 * Log user action
 */
export function logUserAction(action: string, userId: string, context: any = {}) {
  logger.info('User action', {
    action,
    userId,
    ...context
  });
}
