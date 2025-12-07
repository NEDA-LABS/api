import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../repositories/prisma.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /api/v1/health
 * Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'nedapay-backend',
      version: config.apiVersion,
      environment: config.env,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness check - includes database connectivity
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseHealth();
  
  const status = dbHealthy ? 'ready' : 'not_ready';
  const statusCode = dbHealthy ? 200 : 503;
  
  res.status(statusCode).json({
    success: dbHealthy,
    data: {
      status,
      checks: {
        database: dbHealthy ? 'connected' : 'disconnected',
      },
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/v1/health/live
 * Liveness check - basic server health
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'alive',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
