import type { Server } from 'http';
import { pool } from '../db';
import { logger } from './logger';

/**
 * Graceful shutdown handler
 * Ensures clean shutdown of server and connections
 */

let isShuttingDown = false;

export function setupGracefulShutdown(server: Server) {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress, forcing exit');
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown`);

    // Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing server', { error: err.message });
        process.exit(1);
      }

      logger.info('HTTP server closed');

      try {
        // Close database connections
        await pool.end();
        logger.info('Database connections closed');

        // Exit cleanly
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: (error as Error).message });
        process.exit(1);
      }
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      logger.error('Shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000);
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
    shutdown('unhandledRejection');
  });

  logger.info('Graceful shutdown handlers registered');
}
