import express from 'express';
import { logger } from './infra/logger';

const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ready endpoint (checks DB and Redis)
app.get('/ready', async (req, res) => {
  try {
    // Check Postgres
    const { prisma } = await import('./infra/prisma');
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    const { redis } = await import('./infra/redis');
    await redis.ping();

    res.status(200).json({ ready: true });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({ ready: false, error: (error as Error).message });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  const { getMetrics } = await import('./metrics');
  const metrics = getMetrics();
  res.json(metrics);
});

export default app;
