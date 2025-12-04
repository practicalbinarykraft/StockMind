import type { Express } from 'express';
import { pool } from '../db';

/**
 * Health check endpoints for monitoring
 * Used by uptime monitors and load balancers
 */

export function registerHealthRoutes(app: Express) {
  /**
   * GET /health
   * Basic liveness check - is server responding?
   */
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  /**
   * GET /api/health
   * Detailed health check - are dependencies working?
   */
  app.get('/api/health', async (req, res) => {
    const checks: Record<string, any> = {
      server: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    // Check database connection
    try {
      const result = await pool.query('SELECT 1');
      checks.database = result.rows.length === 1 ? 'ok' : 'error';
    } catch (error) {
      checks.database = 'error';
      checks.databaseError = (error as Error).message;
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    checks.memory = {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    };

    // Overall status
    const isHealthy = checks.database === 'ok';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks
    });
  });

  /**
   * GET /api/health/ready
   * Readiness check - is server ready to accept traffic?
   * Used by Kubernetes/load balancers
   */
  app.get('/api/health/ready', async (req, res) => {
    try {
      // Check database is ready
      await pool.query('SELECT 1');

      // Check required env vars
      const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
      const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

      if (missingEnvVars.length > 0) {
        return res.status(503).json({
          status: 'not_ready',
          reason: 'Missing environment variables',
          missing: missingEnvVars
        });
      }

      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        reason: (error as Error).message
      });
    }
  });
}
